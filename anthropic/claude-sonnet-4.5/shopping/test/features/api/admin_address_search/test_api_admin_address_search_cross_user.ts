import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test administrator's ability to search and retrieve addresses across all user
 * types.
 *
 * This test validates that platform administrators have unrestricted access to
 * view and search addresses belonging to any user type (customers, sellers,
 * admins) for platform-wide address management, support operations, and
 * compliance purposes.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as platform administrator
 * 2. Create seller account with addresses
 * 3. Create admin addresses (using existing admin authentication)
 * 4. Execute cross-user address search as admin
 * 5. Validate search results include addresses from all user types
 * 6. Verify pagination and data integrity
 */
export async function test_api_admin_address_search_cross_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as platform administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: RandomGenerator.pick([
          "super_admin",
          "order_manager",
          "content_moderator",
          "support_admin",
        ] as const),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create seller account with addresses
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(2),
        business_type: RandomGenerator.pick([
          "individual",
          "LLC",
          "corporation",
          "partnership",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Create seller addresses
  const sellerAddresses: IShoppingMallAddress[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const address = await api.functional.shoppingMall.seller.addresses.create(
        connection,
        {
          body: {
            recipient_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            address_line1: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 6,
            }),
            city: RandomGenerator.name(1),
            state_province: RandomGenerator.name(1),
            postal_code: typia
              .random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<10000> &
                  tags.Maximum<99999>
              >()
              .toString(),
            country: RandomGenerator.pick([
              "United States",
              "Canada",
              "United Kingdom",
              "South Korea",
            ] as const),
          } satisfies IShoppingMallAddress.ICreate,
        },
      );
      typia.assert(address);
      return address;
    },
  );

  // Step 3: Switch back to admin authentication context
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: admin.name,
      role_level: admin.role_level,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Create admin addresses
  const adminAddresses: IShoppingMallAddress[] = await ArrayUtil.asyncRepeat(
    2,
    async () => {
      const address = await api.functional.shoppingMall.admin.addresses.create(
        connection,
        {
          body: {
            recipient_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            address_line1: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 6,
            }),
            city: RandomGenerator.name(1),
            state_province: RandomGenerator.name(1),
            postal_code: typia
              .random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<10000> &
                  tags.Maximum<99999>
              >()
              .toString(),
            country: RandomGenerator.pick([
              "United States",
              "Canada",
              "United Kingdom",
              "South Korea",
            ] as const),
          } satisfies IShoppingMallAddress.ICreate,
        },
      );
      typia.assert(address);
      return address;
    },
  );

  // Step 4: Execute cross-user address search as admin
  const searchResult: IPageIShoppingMallAddress =
    await api.functional.shoppingMall.admin.addresses.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallAddress.IRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate search results include addresses from all user types
  const allCreatedAddresses = [...sellerAddresses, ...adminAddresses];

  TestValidator.predicate(
    "search result should contain addresses",
    searchResult.data.length > 0,
  );

  TestValidator.predicate(
    "search result should include seller addresses",
    sellerAddresses.some((sellerAddr) =>
      searchResult.data.some((resultAddr) => resultAddr.id === sellerAddr.id),
    ),
  );

  TestValidator.predicate(
    "search result should include admin addresses",
    adminAddresses.some((adminAddr) =>
      searchResult.data.some((resultAddr) => resultAddr.id === adminAddr.id),
    ),
  );

  // Step 6: Verify pagination metadata
  TestValidator.predicate(
    "pagination current page should be correct",
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination records should be positive",
    searchResult.pagination.records > 0,
  );

  TestValidator.predicate(
    "pagination pages should be positive",
    searchResult.pagination.pages > 0,
  );
}
