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

export async function test_api_article_retrieval_view_count_tracking(
  connection: api.IConnection,
) {
  // 1. Create article author account
  const author = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(author);

  // 2. Author creates article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Verify initial view count is 0
  TestValidator.equals(
    "article initial view count is 0",
    article.view_count,
    0,
  );

  // 4. Create first guest user and retrieve article
  const guest1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "GuestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(guest1);

  const articleView1 = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(articleView1);
  TestValidator.equals(
    "first user view increments count to 1",
    articleView1.view_count,
    1,
  );

  // 5. Create second guest user and retrieve article
  const guest2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "GuestPassword456",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(guest2);

  const articleView2 = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(articleView2);
  TestValidator.equals(
    "second user view increments count to 2",
    articleView2.view_count,
    2,
  );

  // 6. First guest retrieves article again within 24-hour window
  const articleView1Again = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(articleView1Again);
  TestValidator.equals(
    "same user view within 24h window does not increment count",
    articleView1Again.view_count,
    2,
  );

  // 7. First guest retrieves article one more time within 24-hour window
  const articleView1Third = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(articleView1Third);
  TestValidator.equals(
    "same user multiple views within 24h window maintain count",
    articleView1Third.view_count,
    2,
  );

  // 8. Create third user and retrieve article
  const guest3 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "GuestPassword789",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(guest3);

  const articleView3 = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(articleView3);
  TestValidator.equals(
    "third user view increments count to 3",
    articleView3.view_count,
    3,
  );
}
