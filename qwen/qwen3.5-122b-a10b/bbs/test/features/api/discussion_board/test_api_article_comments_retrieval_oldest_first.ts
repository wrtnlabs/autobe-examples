import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article comments retrieval sorted by oldest first.
 * 1. Admin creates section
 * 2. Member creates article
 * 3. Member creates 3 comments with different timestamps
 * 4. Retrieve comments and validate oldest-first sorting
 * 5. Validate pagination metadata
 * 6. Validate comment structure
 */
export async function test_api_article_comments_retrieval_oldest_first(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminAuth);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 2. Member setup - create article
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        discussion_board_section_id: section.id,
        title: RandomGenerator.name(),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create 3 comments with different timestamps
  const comment1 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const comment2 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  await new Promise((resolve) => setTimeout(resolve, 10));
  const comment3 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment3);
  // 4. Retrieve comments and validate
  const commentsResponse =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {},
    });
  typia.assert(commentsResponse);
  // 5. Validate all comments are returned
  TestValidator.equals(
    "comment count matches",
    commentsResponse.data.length,
    3,
  );
  // 6. Validate oldest-first sorting
  const timestamps = commentsResponse.data.map((c) => c.created_at);
  for (let i = 1; i < timestamps.length; i++) {
    TestValidator.predicate(
      `comment ${i} is older than comment ${i + 1}`,
      timestamps[i - 1] <= timestamps[i],
    );
  }
  // 7. Validate comment structure
  for (const comment of commentsResponse.data) {
    TestValidator.predicate(
      "comment has author display name",
      comment.author.display_name.length > 0,
    );
    TestValidator.predicate("comment has content", comment.content.length > 0);
    TestValidator.predicate(
      "comment has created_at timestamp",
      comment.created_at.length > 0,
    );
    TestValidator.predicate(
      "comment has updated_at timestamp",
      comment.updated_at.length > 0,
    );
  }
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    commentsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    commentsResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination total records matches comment count",
    commentsResponse.pagination.records,
    3,
  );
  TestValidator.predicate(
    "pagination total pages is valid",
    commentsResponse.pagination.pages >= 1,
  );
}
