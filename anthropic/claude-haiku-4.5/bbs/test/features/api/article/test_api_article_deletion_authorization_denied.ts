import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_article_deletion_authorization_denied(
  connection: api.IConnection,
) {
  // Step 1: Create first member (Article Author)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = "SecurePass123!";
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(memberA);

  // Step 2: Login as Member A to create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });

  // Step 3: Create article by Member A
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    article.deleted_at === null || article.deleted_at === undefined,
  );

  // Step 4: Create second member (Unauthorized Deletion Attempt)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = "DifferentPass456!";
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(memberB);

  // Step 5: Login as Member B
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });

  // Step 6: Member B attempts to delete Member A's article (should fail with authorization error)
  await TestValidator.error(
    "unauthorized member cannot delete article authored by another member",
    async () => {
      await api.functional.discussionBoard.member.articles.erase(connection, {
        articleId: article.id,
      });
    },
  );
}
