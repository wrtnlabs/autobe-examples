import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_article_update_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register a new user for testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: userEmail,
        bio: "Economic policy analyst and political commentator",
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(user);

  // 2. Create a new discussion article
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: "Federal Reserve Policy Impact on Global Markets",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        category: "Economic Policy",
        status: "published",
        econ_political_discussion_user_id: user.id,
        attachments: [],
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Verify article was created successfully
  TestValidator.equals(
    "article created with correct author",
    article.econ_political_discussion_user_id,
    user.id,
  );
  TestValidator.equals(
    "article has active status",
    article.status,
    "published",
  );
  TestValidator.predicate(
    "article has no deletion timestamp initially",
    !article.deleted_at,
  );

  // 3. Perform soft delete by updating with deleted_at timestamp
  const deletionTimestamp: string = new Date().toISOString();
  const softDeletedArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.update(connection, {
      articleId: article.id,
      body: {
        deleted_at: deletionTimestamp,
      } satisfies IEconPoliticalDiscussionArticle.IUpdate,
    });
  typia.assert(softDeletedArticle);

  // 4. Verify soft delete functionality
  TestValidator.equals(
    "article ID remains consistent",
    softDeletedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "article title preserved",
    softDeletedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content preserved",
    softDeletedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "article author reference maintained",
    softDeletedArticle.econ_political_discussion_user_id,
    article.econ_political_discussion_user_id,
  );
  TestValidator.equals(
    "deletion timestamp properly set",
    softDeletedArticle.deleted_at,
    deletionTimestamp,
  );

  // Verify the timestamp format is valid ISO 8601
  TestValidator.predicate(
    "deletion timestamp is valid ISO format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      softDeletedArticle.deleted_at!,
    ),
  );

  // 5. Verify article can still be accessed (not hard deleted)
  TestValidator.predicate(
    "article exists in system",
    softDeletedArticle.id !== null && softDeletedArticle.id !== undefined,
  );
  TestValidator.predicate(
    "article data integrity maintained",
    softDeletedArticle.author.id === user.id,
  );

  // 6. Test recovery scenario - remove deletion timestamp
  const recoveredArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.update(connection, {
      articleId: article.id,
      body: {
        deleted_at: null,
      } satisfies IEconPoliticalDiscussionArticle.IUpdate,
    });
  typia.assert(recoveredArticle);

  // Verify recovery functionality
  TestValidator.equals(
    "article successfully recovered",
    recoveredArticle.deleted_at,
    null,
  );
  TestValidator.equals(
    "article data unchanged after recovery",
    recoveredArticle.title,
    article.title,
  );
  TestValidator.equals(
    "author reference unchanged",
    recoveredArticle.econ_political_discussion_user_id,
    article.econ_political_discussion_user_id,
  );

  // 7. Final verification that article is back to active state
  TestValidator.predicate(
    "article restored to active state",
    !recoveredArticle.deleted_at,
  );
  TestValidator.equals(
    "article ID consistent throughout lifecycle",
    recoveredArticle.id,
    article.id,
  );
}
