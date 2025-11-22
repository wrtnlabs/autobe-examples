import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_article_update_authorization_validation(
  connection: api.IConnection,
) {
  // Test article update authorization and ownership validation

  // 1. Create author user
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const author: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: authorEmail,
        bio: "Economic policy analyst and discussion board author",
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(author);

  // 2. Create unauthorized user
  const unauthorizedEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const unauthorizedUser: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: unauthorizedEmail,
        bio: "Regular discussion board user",
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(unauthorizedUser);

  // 3. Create article as author
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: "Economic Policy Discussion: Inflation Control Strategies",
        content:
          "This article discusses various strategies for controlling inflation in today's economic environment. We will examine monetary policy tools and their effectiveness.",
        category: "Economic Policy",
        status: "published",
        econ_political_discussion_user_id: author.id,
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Test 1: Author successfully updates their own article
  const updatedByAuthor: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.update(connection, {
      articleId: article.id,
      body: {
        title:
          "Updated: Economic Policy Discussion - Inflation Control Strategies",
        content:
          "This article discusses various strategies for controlling inflation in today's economic environment. We will examine monetary policy tools, fiscal policy coordination, and their effectiveness in the current market conditions.",
        category: "Economic Policy",
      } satisfies IEconPoliticalDiscussionArticle.IUpdate,
    });
  typia.assert(updatedByAuthor);

  TestValidator.equals(
    "author can update own article title",
    updatedByAuthor.title,
    "Updated: Economic Policy Discussion - Inflation Control Strategies",
  );
  TestValidator.equals(
    "author can update own article content",
    updatedByAuthor.content.includes("fiscal policy coordination"),
    true,
  );
  TestValidator.equals(
    "author ID remains unchanged",
    updatedByAuthor.econ_political_discussion_user_id,
    author.id,
  );
  TestValidator.equals(
    "article status preserved",
    updatedByAuthor.status,
    "published",
  );
  TestValidator.equals(
    "updated timestamp is newer",
    updatedByAuthor.updated_at > article.updated_at,
    true,
  );

  // Test 2: Unauthorized user attempts to update article (should fail)
  await TestValidator.error(
    "unauthorized user cannot update another user's article",
    async () => {
      await api.functional.econPoliticalDiscussion.articles.update(connection, {
        articleId: article.id,
        body: {
          title: "Unauthorized Update Attempt",
          content: "This should not be allowed",
        } satisfies IEconPoliticalDiscussionArticle.IUpdate,
      });
    },
  );

  // Test 3: Verify article remains unchanged after unauthorized attempt
  const articleAfterUnauthorizedAttempt: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.update(connection, {
      articleId: article.id,
      body: {} satisfies IEconPoliticalDiscussionArticle.IUpdate,
    });
  typia.assert(articleAfterUnauthorizedAttempt);

  TestValidator.equals(
    "article unchanged after unauthorized attempt",
    articleAfterUnauthorizedAttempt.title,
    "Updated: Economic Policy Discussion - Inflation Control Strategies",
  );
}
