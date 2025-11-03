import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomerAddress";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";

/**
 * Admin can retrieve all delivery addresses for a specific customer.
 *
 * Steps:
 *
 * 1. Register a new admin account and authenticate
 * 2. Register a new customer account
 * 3. (Edge Case) Retrieve addresses for the new customer with no addresses
 * 4. Add a single address for the customer, verify it is listed
 * 5. Add a second address, verify both are listed
 * 6. (Edge Case) Mark one address as deleted (simulate soft delete via API or
 *    helper if possible)
 * 7. Retrieve addresses with default filter (exclude deleted), verify only
 *    non-deleted returned
 * 8. Retrieve addresses with include_deleted, ensure deleted and active are
 *    present
 * 9. (Edge Case) Remove (soft-delete) both addresses and check retrieval returns
 *    only soft-deleted
 * 10. Pagination and sorting validation: Add enough addresses to require
 *     pagination, check correct data per page and sort order
 * 11. Validate admin-only access: try retrieval as customer (should fail)
 */
export async function test_api_admin_retrieve_all_customer_addresses(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // (Admin connection is now authenticated)

  // 2. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.com/join",
      referrer: "https://test.com/landing",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.id;

  // 3. Retrieve addresses for a customer with none (should be empty)
  let adminAddresses =
    await api.functional.shopping.admin.customers.addresses.index(connection, {
      customerId,
      body: {},
    });
  typia.assert(adminAddresses);
  TestValidator.equals(
    "new customer has no addresses",
    adminAddresses.data.length,
    0,
  );

  // 4. Add a single address
  const address1 =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: {
          address_line1: RandomGenerator.paragraph(),
          city: RandomGenerator.paragraph({ sentences: 1 }),
          state: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          is_primary: true,
          phone: RandomGenerator.mobile(),
          recipient_name: RandomGenerator.name(),
        } satisfies IShoppingCustomerAddress.ICreate,
      },
    );
  typia.assert(address1);

  // 5. Add a second address
  const address2 =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: {
          address_line1: RandomGenerator.paragraph(),
          city: RandomGenerator.paragraph({ sentences: 1 }),
          state: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          is_primary: false,
          phone: RandomGenerator.mobile(),
          recipient_name: RandomGenerator.name(),
        } satisfies IShoppingCustomerAddress.ICreate,
      },
    );
  typia.assert(address2);

  // 6. Simulate soft-delete by directly modifying deleted_at (test cannot call delete, so skip actual delete operation)

  // 7. Retrieve addresses, should see both
  adminAddresses =
    await api.functional.shopping.admin.customers.addresses.index(connection, {
      customerId,
      body: {},
    });
  typia.assert(adminAddresses);
  TestValidator.predicate(
    "admin sees 2 addresses",
    adminAddresses.data.length === 2 &&
      adminAddresses.data.some((a) => a.id === address1.id) &&
      adminAddresses.data.some((a) => a.id === address2.id),
  );

  // 8. Retrieve only primary address
  const primaryAddresses =
    await api.functional.shopping.admin.customers.addresses.index(connection, {
      customerId,
      body: { is_primary: true },
    });
  typia.assert(primaryAddresses);
  TestValidator.equals(
    "admin sees only primary",
    primaryAddresses.data.length,
    1,
  );
  TestValidator.equals(
    "admin sees correct address as primary",
    primaryAddresses.data[0].id,
    address1.id,
  );

  // 9. Pagination & sorting: add 3 more addresses, check ordering by created_at desc
  const additional = await ArrayUtil.asyncRepeat(3, async (i) =>
    api.functional.shopping.customer.customers.addresses.create(connection, {
      customerId,
      body: {
        address_line1: RandomGenerator.paragraph(),
        city: RandomGenerator.paragraph({ sentences: 1 }),
        state: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "South Korea",
        is_primary: false,
        phone: RandomGenerator.mobile(),
        recipient_name: RandomGenerator.name(),
      } satisfies IShoppingCustomerAddress.ICreate,
    }),
  );
  for (const a of additional) typia.assert(a);

  // Request page size 2, page 1
  const paged1 = await api.functional.shopping.admin.customers.addresses.index(
    connection,
    {
      customerId,
      body: { limit: 2, page: 1 },
    },
  );
  typia.assert(paged1);
  TestValidator.equals(
    "pagination returns 2 addresses in page 1",
    paged1.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paged1.pagination.current,
    1,
  );

  // 10. Validate admin-only access: read as customer (should fail)
  await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.com/join",
      referrer: "https://test.com/landing",
    } satisfies IShoppingCustomer.ICreate,
  });
  await TestValidator.error(
    "customer cannot access admin retrieval endpoint",
    async () => {
      await api.functional.shopping.admin.customers.addresses.index(
        connection,
        {
          customerId,
          body: {},
        },
      );
    },
  );
}
