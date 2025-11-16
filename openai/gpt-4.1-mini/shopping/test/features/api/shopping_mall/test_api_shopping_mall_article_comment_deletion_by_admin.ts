import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the complete workflow for an admin user deleting a comment from a
 * specific shopping mall article category.
 *
 * This test verifies that an admin user can successfully register to obtain
 * authentication tokens, and then use those tokens to delete a comment from a
 * specific shopping mall article category. It confirms deletion behavior,
 * authentication enforcement, and error handling for unauthorized requests.
 *
 * Steps:
 *
 * 1. Admin signs up (join) to get authorization token
 * 2. Attempt deletion without authorization - should fail
 * 3. Perform authorized deletion of a shopping mall article comment
 *
 * This ensures security and correct functioning of the comment deletion
 * endpoint for admin roles.
 */
export async function test_api_shopping_mall_article_comment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) to obtain authentication tokens
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Attempt to delete comment without authorization (unauth connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "delete comment fails without authorization",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallArticleCategories.comments.erase(
        unauthConnection,
        {
          shoppingMallArticleCategoryId: typia.random<
            string & tags.Format<"uuid">
          >(),
          shoppingMallArticleCommentId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );

  // 3. Admin deletes a shopping mall article comment
  const shoppingMallArticleCategoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  const shoppingMallArticleCommentId = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.shoppingMall.admin.shoppingMallArticleCategories.comments.erase(
    connection, // This connection now has the admin token from admin join call
    {
      shoppingMallArticleCategoryId: shoppingMallArticleCategoryId,
      shoppingMallArticleCommentId: shoppingMallArticleCommentId,
    },
  );

  // 4. No response content, just assert success by absence of errors
}
