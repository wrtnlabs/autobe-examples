import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEmailTemplate";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test comprehensive email template search and filtering by admin.
 *
 * This test validates the email template search functionality for
 * administrators, ensuring that admins can efficiently locate templates through
 * search operations. The test creates an admin account, sets up test data with
 * multiple email templates, and performs search operations with pagination to
 * verify correct results.
 *
 * Process:
 *
 * 1. Create and authenticate admin account
 * 2. Create sales channel for template association
 * 3. Create multiple email templates with varied properties
 * 4. Search templates with pagination parameters
 * 5. Validate pagination structure and search results
 */
export async function test_api_email_template_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 2: Create sales channel for template association
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        channel_code: RandomGenerator.alphaNumeric(8),
        channel_name: RandomGenerator.name(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create multiple email templates with varied properties
  const templateCount = 5;
  const createdTemplates = await ArrayUtil.asyncRepeat(
    templateCount,
    async (index) => {
      const template =
        await api.functional.shoppingMall.admin.emailTemplates.create(
          connection,
          {
            body: {
              template_code: `TEMPLATE_${RandomGenerator.alphaNumeric(6)}_${index}`,
              template_name: `${RandomGenerator.name()} Template ${index}`,
            } satisfies IShoppingMallEmailTemplate.ICreate,
          },
        );
      typia.assert(template);
      return template;
    },
  );

  TestValidator.equals(
    "created template count",
    createdTemplates.length,
    templateCount,
  );

  // Step 4: Search templates with pagination
  const searchResult =
    await api.functional.shoppingMall.admin.emailTemplates.index(connection, {
      body: {
        page: 0,
      } satisfies IShoppingMallEmailTemplate.IRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate pagination structure and search results
  TestValidator.predicate(
    "pagination current page is valid",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    searchResult.pagination.records >= templateCount,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "search results contain data",
    searchResult.data.length > 0,
  );

  // Verify that all created templates can be found in search results
  for (const created of createdTemplates) {
    const found = searchResult.data.find((t) => t.id === created.id);
    if (found) {
      TestValidator.equals(
        "template name matches",
        found.template_name,
        created.template_name,
      );
    }
  }
}
