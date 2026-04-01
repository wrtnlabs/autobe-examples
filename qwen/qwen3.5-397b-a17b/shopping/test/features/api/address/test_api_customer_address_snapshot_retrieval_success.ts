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

export async function test_api_customer_address_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(auth);
  // 2. Create initial shipping address with specific values
  const initialAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: "123 Gangnam-daero",
          city: "Seoul",
          state: "Seoul",
          postalCode: "06000",
          country: "South Korea",
          isDefault: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(initialAddress);
  // 3. Update the address to trigger snapshot creation
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: {
          recipientName: "Jane Doe",
          city: "Busan",
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  // 4. List address snapshots to obtain snapshotId
  const snapshotList =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  // Verify snapshots were created
  TestValidator.predicate("snapshot exists", snapshotList.data.length > 0);
  // 5. Get the first snapshot (most recent, created by the update)
  const snapshot = snapshotList.data[0]!;
  // 6. Retrieve the specific snapshot by ID
  const retrievedSnapshot =
    await api.functional.shoppingMall.customer.addresses.snapshots.at(
      customerConnection,
      {
        addressId: initialAddress.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 7. Verify snapshot contains original values (pre-update state)
  TestValidator.equals(
    "snapshot recipient name matches original",
    retrievedSnapshot.recipientName,
    "John Doe",
  );
  TestValidator.equals(
    "snapshot city matches original",
    retrievedSnapshot.city,
    "Seoul",
  );
  // 8. Verify snapshot.address relation returns current address summary
  TestValidator.equals(
    "snapshot addressId matches parent address",
    retrievedSnapshot.addressId,
    initialAddress.id,
  );
  TestValidator.equals(
    "snapshot address shows updated recipient",
    retrievedSnapshot.address.recipientName,
    "Jane Doe",
  );
  TestValidator.equals(
    "snapshot address shows updated city",
    retrievedSnapshot.address.city,
    "Busan",
  );
  // 9. Verify snapshot is immutable and preserves historical data
  TestValidator.notEquals(
    "snapshot differs from current address (recipient)",
    retrievedSnapshot.recipientName,
    updatedAddress.recipient_name,
  );
  TestValidator.notEquals(
    "snapshot differs from current address (city)",
    retrievedSnapshot.city,
    updatedAddress.city,
  );
}
