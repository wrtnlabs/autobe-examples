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
 * Test access control and ownership validation for address snapshot retrieval.
 *
 * This test verifies that customers can only access snapshots for their own addresses.
 * When a customer attempts to access another customer's address snapshots, the system
 * returns 404 Not Found to avoid revealing address existence. The test also validates
 * that the address owner can successfully retrieve their own snapshot history.
 *
 * Test flow:
 * 1. Customer A registers and creates an address
 * 2. Customer A updates the address to generate snapshots
 * 3. Customer B registers independently
 * 4. Customer B attempts to access Customer A's address snapshots (should fail with 404)
 * 5. Customer A successfully retrieves their own address snapshots
 * 6. Validate snapshot data integrity and access control behavior
 */
export async function test_api_customer_address_snapshot_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A registration and setup
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Customer A creates an address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  TestValidator.equals(
    "address owner is Customer A",
    address.customer.id,
    customerA.id,
  );
  // 3. Customer A updates the address to generate snapshots
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerAConnection,
      {
        addressId: address.id,
        body: {
          recipientName: RandomGenerator.name(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.notEquals(
    "address was updated",
    address.updated_at,
    updatedAddress.updated_at,
  );
  // 4. Customer B registration (independent customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  TestValidator.notEquals(
    "Customer B is different from Customer A",
    customerB.id,
    customerA.id,
  );
  // 5. Customer B attempts to access Customer A's address snapshots (should fail with 404)
  await TestValidator.httpError(
    "Customer B cannot access Customer A's address snapshots",
    404,
    async () => {
      await api.functional.shoppingMall.customer.addresses.snapshots.index(
        customerBConnection,
        {
          addressId: address.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallAddressSnapshot.IRequest,
        },
      );
    },
  );
  // 6. Customer A successfully retrieves their own address snapshots
  const snapshots =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerAConnection,
      {
        addressId: address.id,
        body: {
          page: 1,
          limit: 10,
          sort: ["created_at DESC"],
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate snapshot data
  TestValidator.predicate("snapshots exist", snapshots.data.length >= 1);
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records >= 1,
  );
  // 8. Validate snapshot integrity - each snapshot should have the address reference
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot address matches",
      snapshot.address.id,
      address.id,
    );
    TestValidator.predicate(
      "snapshot has creation timestamp",
      snapshot.createdAt !== null,
    );
  }
  // 9. Verify snapshot contains updated data from the address modification
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals(
    "latest snapshot recipient name",
    latestSnapshot.recipientName,
    updatedAddress.recipient_name,
  );
  TestValidator.equals(
    "latest snapshot street address",
    latestSnapshot.streetAddress,
    updatedAddress.street_address,
  );
  TestValidator.equals(
    "latest snapshot city",
    latestSnapshot.city,
    updatedAddress.city,
  );
}
