import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates administrator's privilege to update any discussion article,
 * cross-user scenario.
 *
 * 1. Register an admin (admin join), and login as admin to capture their identity.
 * 2. Register a user (user join), and login as user.
 * 3. User creates a discussion article.
 * 4. Switch back to admin via admin login.
 * 5. Admin updates user's article (title/content change only).
 * 6. Check that update succeeded: title/content changed, updated_at changed,
 *    id/author/created_at unchanged.
 * 7. Switch to the user, attempt the same update via admin endpoint, expect error
 *    (permission denied), confirm only admins can do this.
 */
export async function test_api_discussion_article_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test-discussion-admin-join.example.org/page",
      referrer: "https://test-discussion-admin-join.example.org/landing",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Step 2: Register and login as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(11);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<72> &
        tags.Format<"password">,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // Step 3: User creates article
  const articleCreate =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }) as string & tags.MaxLength<200>,
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }) as string & tags.MaxLength<10000>,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(articleCreate);
  const original = articleCreate;

  // Step 4: Switch to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // Step 5: Admin updates the article (change title/content)
  const updateData = {
    title: RandomGenerator.name(3) as string & tags.MaxLength<200>,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }) as string & tags.MaxLength<10000>,
  } satisfies IDiscussionBoardArticle.IUpdate;
  const updated = await api.functional.discussionBoard.admin.articles.update(
    connection,
    {
      articleId: original.id,
      body: updateData,
    },
  );
  typia.assert(updated);
  TestValidator.notEquals(
    "updated_at changed after admin update",
    updated.updated_at,
    original.updated_at,
  );
  TestValidator.equals(
    "id unchanged after admin update",
    updated.id,
    original.id,
  );
  TestValidator.equals(
    "author unchanged after admin update",
    updated.author,
    original.author,
  );
  TestValidator.equals(
    "created_at unchanged after admin update",
    updated.created_at,
    original.created_at,
  );
  TestValidator.equals(
    "title updated by admin",
    updated.title,
    updateData.title,
  );
  TestValidator.equals(
    "content updated by admin",
    updated.content,
    updateData.content,
  );

  // Step 6: Switch to user and try to invoke admin update endpoint (should fail)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://test-discussion-user-login.example.org/page",
      referrer: "https://test-discussion-user-login.example.org/landing",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  await TestValidator.error(
    "non-admin cannot access admin article update endpoint",
    async () => {
      await api.functional.discussionBoard.admin.articles.update(connection, {
        articleId: original.id,
        body: {
          title: "Should Not Work" as string & tags.MaxLength<200>,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );
}
