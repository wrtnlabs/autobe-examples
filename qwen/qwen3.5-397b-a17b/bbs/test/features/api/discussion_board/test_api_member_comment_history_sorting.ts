import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test member comment history sorting functionality.
 *
 * This test validates the sorting parameter for member comment history retrieval:
 * 1. Creates a member account and authenticates
 * 2. Creates an article for the member to comment on
 * 3. Posts 5 comments with distinct content
 * 4. Tests sort='created_at_asc' - validates oldest-first order
 * 5. Tests sort='created_at_desc' - validates newest-first order
 * 6. Verifies all comments present in both sort orders
 * 7. Validates pagination metadata consistency
 */
export async function test_api_member_comment_history_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  // 2. Create an article for the member to comment on
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        sectionId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create 5 comments with distinct content
  const commentContents = ArrayUtil.repeat(5, (index) => ({
    content: `Comment ${index + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
  }));
  const comments: IDiscussionBoardComment[] = [];
  for (const commentData of commentContents) {
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          body: commentData satisfies IDiscussionBoardComment.ICreate,
          params: { articleId: article.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Test ascending sort (oldest first)
  const ascResponse =
    await api.functional.discussionBoard.members.comments.index(
      memberConnection,
      {
        memberId: memberId,
        body: {
          sort: "created_at_asc",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(ascResponse);
  // Validate ascending order
  TestValidator.equals(
    "ascending sort - comment count",
    ascResponse.data.length,
    5,
  );
  TestValidator.equals(
    "ascending sort - pagination records",
    ascResponse.pagination.records,
    5,
  );
  // Verify timestamps are in ascending order (oldest first)
  for (let i = 1; i < ascResponse.data.length; i++) {
    const prevTime = new Date(ascResponse.data[i - 1].created_at).getTime();
    const currTime = new Date(ascResponse.data[i].created_at).getTime();
    TestValidator.predicate(
      `ascending order - comment ${i} >= comment ${i - 1}`,
      prevTime <= currTime,
    );
  }
  // 5. Test descending sort (newest first)
  const descResponse =
    await api.functional.discussionBoard.members.comments.index(
      memberConnection,
      {
        memberId: memberId,
        body: {
          sort: "created_at_desc",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(descResponse);
  // Validate descending order
  TestValidator.equals(
    "descending sort - comment count",
    descResponse.data.length,
    5,
  );
  TestValidator.equals(
    "descending sort - pagination records",
    descResponse.pagination.records,
    5,
  );
  // Verify timestamps are in descending order (newest first)
  for (let i = 1; i < descResponse.data.length; i++) {
    const prevTime = new Date(descResponse.data[i - 1].created_at).getTime();
    const currTime = new Date(descResponse.data[i].created_at).getTime();
    TestValidator.predicate(
      `descending order - comment ${i} <= comment ${i - 1}`,
      prevTime >= currTime,
    );
  }
  // 6. Verify all comments present in both sort orders
  const ascCommentIds = ascResponse.data.map((c) => c.id).sort();
  const descCommentIds = descResponse.data.map((c) => c.id).sort();
  TestValidator.equals(
    "same comments in both sort orders",
    ascCommentIds,
    descCommentIds,
  );
  // 7. Verify pagination metadata consistency
  TestValidator.equals(
    "pagination current page matches",
    ascResponse.pagination.current,
    descResponse.pagination.current,
  );
  TestValidator.equals(
    "pagination limit matches",
    ascResponse.pagination.limit,
    descResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination total records matches",
    ascResponse.pagination.records,
    descResponse.pagination.records,
  );
  TestValidator.equals(
    "pagination total pages matches",
    ascResponse.pagination.pages,
    descResponse.pagination.pages,
  );
  // 8. Verify first comment in asc is last in desc (and vice versa)
  TestValidator.equals(
    "first asc comment is last desc comment",
    ascResponse.data[0].id,
    descResponse.data[descResponse.data.length - 1].id,
  );
  TestValidator.equals(
    "last asc comment is first desc comment",
    ascResponse.data[ascResponse.data.length - 1].id,
    descResponse.data[0].id,
  );
}
