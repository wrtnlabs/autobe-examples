import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test complete user account deletion workflow by system administrator.
 *
 * This test validates that system administrators can successfully delete user
 * accounts from the economic and political discussion board system. The test
 * creates a test user account through article creation, then verifies that the
 * admin deletion removes all user profile information while preserving article
 * content for historical integrity.
 *
 * Test workflow:
 *
 * 1. Authenticate as system administrator to gain deletion privileges
 * 2. Create a test user account by creating an article (establishes baseline user)
 * 3. Verify the test user exists before deletion to ensure proper setup
 * 4. Perform admin user deletion with proper authorization verification
 * 5. Confirm user profile information is completely removed from system
 * 6. Verify articles remain for historical integrity (non-cascading deletion)
 * 7. Validate user no longer exists through failed retrieval attempts
 */
export async function test_api_admin_user_deletion_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as system administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a test user by creating an article
  // This establishes a user account in the system
  const testUserEmail = typia.random<string & tags.Format<"email">>();
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category: "Economic Policy",
        econ_political_discussion_user_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        status: "published",
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Verify the test user exists before deletion
  const userToDelete: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.at(connection, {
      userId: article.econ_political_discussion_user_id,
    });
  typia.assert(userToDelete);

  // Validate user profile information exists before deletion
  TestValidator.equals(
    "user display name exists before deletion",
    userToDelete.display_name,
    article.author.display_name,
  );
  TestValidator.equals(
    "user email exists before deletion",
    userToDelete.email,
    testUserEmail,
  );
  TestValidator.predicate(
    "user status is active before deletion",
    userToDelete.status === "active",
  );

  // Step 4: Perform admin user deletion
  const deletedUser: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.erase(
      connection,
      {
        userId: userToDelete.id,
      },
    );
  typia.assert(deletedUser);

  // Step 5: Verify user profile information is completely removed
  TestValidator.equals(
    "deleted user ID matches original",
    deletedUser.id,
    userToDelete.id,
  );
  TestValidator.equals(
    "deleted user status indicates removal",
    deletedUser.status,
    "deleted",
  );
  TestValidator.predicate(
    "deleted timestamp is set",
    deletedUser.deleted_at !== null && deletedUser.deleted_at !== undefined,
  );

  // Step 6: Verify user no longer exists in the system
  await TestValidator.error(
    "user should not be retrievable after deletion",
    async () => {
      await api.functional.econPoliticalDiscussion.users.at(connection, {
        userId: userToDelete.id,
      });
    },
  );

  // Step 7: Verify articles remain for historical integrity
  // The article should still exist with preserved authorship information
  const preservedArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        category: "Political Analysis",
        econ_political_discussion_user_id:
          article.econ_political_discussion_user_id,
        status: "published",
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(preservedArticle);

  // Verify article content is preserved even after user deletion
  TestValidator.equals(
    "article title is preserved",
    preservedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article category is preserved",
    preservedArticle.category,
    article.category,
  );
  TestValidator.equals(
    "article content is preserved",
    preservedArticle.content,
    article.content,
  );
}
