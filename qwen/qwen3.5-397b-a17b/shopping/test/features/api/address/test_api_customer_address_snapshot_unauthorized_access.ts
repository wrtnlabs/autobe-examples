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
 * Test access control when a customer attempts to retrieve another customer's address snapshot.
 *
 * Test Steps:
 * 1. Customer A registers and authenticates using authorize_customer_join utility
 * 2. Customer A creates a shipping address using generate_random_shopping_mall_customer_addresses_create utility
 * 3. Customer A updates the address to trigger snapshot creation
 * 4. Customer A lists snapshots to obtain the snapshotId
 * 5. Customer B registers and authenticates (separate account) using authorize_customer_join utility
 * 6. Customer B attempts to retrieve Customer A's address snapshot using Customer A's addressId and snapshotId
 * 7. System returns 403 Forbidden error
 *
 * Business Validation:
 * - System validates address ownership before allowing snapshot access
 * - Customers cannot access snapshots belonging to other customers
 * - Proper authorization error is returned
 * - Security boundary between customer accounts is enforced
 * - Snapshot access is restricted to the address owner only
 */
export async function test_api_customer_address_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A registers and authenticates
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  // 2. Customer A creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "South Korea",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Customer A updates the address to trigger snapshot creation
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerAConnection,
      {
        addressId: address.id,
        body: {
          recipientName: RandomGenerator.name(),
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  // 4. Customer A lists snapshots to obtain the snapshotId
  const snapshots =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerAConnection,
      {
        addressId: address.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "at least one snapshot exists",
    () => snapshots.data.length > 0,
  );
  const snapshotId = snapshots.data[0]!.id;
  // 5. Customer B registers and authenticates (separate account)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  // 6-7. Customer B attempts to access Customer A's address snapshot - should fail with 403
  await TestValidator.error(
    "Customer B cannot access Customer A's address snapshot",
    async () => {
      await api.functional.shoppingMall.customer.addresses.snapshots.at(
        customerBConnection,
        {
          addressId: address.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
