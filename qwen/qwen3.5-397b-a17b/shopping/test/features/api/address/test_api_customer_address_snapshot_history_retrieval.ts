import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddressSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test customer address snapshot history retrieval.
 *
 * This test validates the address snapshot audit trail functionality:
 * 1. Customer registers and authenticates
 * 2. Customer creates an initial shipping address
 * 3. Customer updates the address multiple times (recipient name, phone, street address)
 * 4. Each update automatically creates an immutable snapshot
 * 5. Retrieve snapshot history and verify all snapshots exist in descending order
 * 6. Validate each snapshot preserves the complete address state at modification time
 * 7. Verify snapshot count matches the number of address modifications
 */
export async function test_api_customer_address_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create initial address
  const initialAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postalCode: "12345",
          country: RandomGenerator.name(),
          isDefault: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(initialAddress);
  // 3. First update - change recipient name
  const firstUpdate =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: {
          recipientName: RandomGenerator.name(),
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.notEquals(
    "recipient name changed",
    initialAddress.recipient_name,
    firstUpdate.recipient_name,
  );
  // 4. Second update - change phone number
  const secondUpdate =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: {
          recipientPhone: RandomGenerator.mobile(),
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.notEquals(
    "phone number changed",
    firstUpdate.recipient_phone,
    secondUpdate.recipient_phone,
  );
  // 5. Third update - change street address
  const thirdUpdate =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: {
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(thirdUpdate);
  TestValidator.notEquals(
    "street address changed",
    secondUpdate.street_address,
    thirdUpdate.street_address,
  );
  // 6. Retrieve snapshot history
  const snapshotHistory =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: {
          page: 1,
          limit: 10,
          sort: ["created_at DESC"],
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(snapshotHistory);
  // 7. Validate snapshot count (should be 3 snapshots for 3 updates)
  TestValidator.equals("snapshot count", snapshotHistory.data.length, 3);
  TestValidator.equals("total records", snapshotHistory.pagination.records, 3);
  // 8. Validate snapshots are in descending order by created_at
  for (let i = 0; i < snapshotHistory.data.length - 1; i++) {
    const current = new Date(snapshotHistory.data[i].createdAt).getTime();
    const next = new Date(snapshotHistory.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} is newer than ${i + 1}`,
      current >= next,
    );
  }
  // 9. Validate nested address summary in each snapshot references current address
  for (const snapshot of snapshotHistory.data) {
    TestValidator.equals(
      "address ID matches",
      snapshot.address.id,
      initialAddress.id,
    );
    TestValidator.equals(
      "address recipient name matches current",
      snapshot.address.recipientName,
      thirdUpdate.recipient_name,
    );
  }
  // 10. Validate snapshots preserve distinct historical timestamps
  const oldestSnapshot = snapshotHistory.data[snapshotHistory.data.length - 1];
  const newestSnapshot = snapshotHistory.data[0];
  TestValidator.notEquals(
    "oldest snapshot differs from newest",
    oldestSnapshot.createdAt,
    newestSnapshot.createdAt,
  );
  // Verify oldest snapshot (first update) has the first updated recipient name
  TestValidator.equals(
    "oldest snapshot preserves first update recipient name",
    oldestSnapshot.recipientName,
    firstUpdate.recipient_name,
  );
}
