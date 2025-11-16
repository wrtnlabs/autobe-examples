import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the general search parameter that searches across multiple admin fields.
 *
 * This test validates flexible text-based admin discovery by creating admin
 * accounts with distinctive values in different fields (email, full_name,
 * phone_number) and verifying that the general search parameter successfully
 * finds admins regardless of which specific field contains the matching text.
 *
 * Process:
 *
 * 1. Create admin accounts with distinctive searchable values in different fields
 * 2. Authenticate as admin to access search functionality
 * 3. Search with email substring and verify correct admin is found
 * 4. Search with name substring and verify correct admin is found
 * 5. Search with phone digits and verify correct admin is found
 * 6. Validate all search results return proper admin summary data
 */
export async function test_api_admin_search_general_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create distinctive admin accounts for searching

  // Admin with distinctive email - use unique prefix for email search
  const uniqueEmailPrefix =
    "searchable_email_" + RandomGenerator.alphaNumeric(8);
  const emailSearchableAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `${uniqueEmailPrefix}@testdomain.com` satisfies string &
          tags.Format<"email">,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(emailSearchableAdmin);

  // Admin with distinctive full name - use unique name for name search
  const uniqueNamePart = "UniqueSearchName" + RandomGenerator.alphaNumeric(6);
  const nameSearchableAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: `${uniqueNamePart} TestUser`,
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(nameSearchableAdmin);

  // Admin with distinctive phone number - use unique phone pattern
  const uniquePhoneDigits = RandomGenerator.alphaNumeric(4);
  const distinctivePhone = `010${uniquePhoneDigits}9999`;
  const phoneSearchableAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: distinctivePhone,
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(phoneSearchableAdmin);

  // Step 2: Already authenticated from join operations (last join)

  // Step 3: Test general search with email substring
  const emailSearchResults: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        search: uniqueEmailPrefix,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(emailSearchResults);

  TestValidator.predicate(
    "email search should find at least one admin",
    emailSearchResults.data.length > 0,
  );

  const foundEmailAdmin = emailSearchResults.data.find(
    (admin) => admin.id === emailSearchableAdmin.id,
  );
  const validatedEmailAdmin = typia.assert(foundEmailAdmin!);

  TestValidator.equals(
    "found admin email matches created admin",
    validatedEmailAdmin.email,
    emailSearchableAdmin.email,
  );

  // Step 4: Test general search with name substring
  const nameSearchResults: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        search: uniqueNamePart,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(nameSearchResults);

  TestValidator.predicate(
    "name search should find at least one admin",
    nameSearchResults.data.length > 0,
  );

  const foundNameAdmin = nameSearchResults.data.find(
    (admin) => admin.id === nameSearchableAdmin.id,
  );
  const validatedNameAdmin = typia.assert(foundNameAdmin!);

  TestValidator.equals(
    "found admin name matches created admin",
    validatedNameAdmin.full_name,
    nameSearchableAdmin.full_name,
  );

  // Step 5: Test general search with phone number digits
  const phoneSearchResults: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        search: uniquePhoneDigits,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(phoneSearchResults);

  TestValidator.predicate(
    "phone search should find at least one admin",
    phoneSearchResults.data.length > 0,
  );

  const foundPhoneAdmin = phoneSearchResults.data.find(
    (admin) => admin.id === phoneSearchableAdmin.id,
  );
  const validatedPhoneAdmin = typia.assert(foundPhoneAdmin!);

  TestValidator.equals(
    "found admin phone matches created admin",
    validatedPhoneAdmin.phone_number,
    phoneSearchableAdmin.phone_number,
  );
}
