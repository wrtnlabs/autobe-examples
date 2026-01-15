import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardArticleCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCommentReply";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCommentReply";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { generate_random_discussion_board_citizen_comments_create } from "../../../generate/generate_random_discussion_board_citizen_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_replies_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create an article to host the parent comment
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Create a parent comment with 50 replies (to ensure pagination)
  const parentComment: IDiscussionBoardArticleComment =
    await generate_random_discussion_board_citizen_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: undefined, // Fixed: Changed null to undefined to match type '(string & Format<"uuid">) | undefined'
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // Generate 50 reply comments
  const replyPromises = ArrayUtil.repeat(50, async () => {
    return await generate_random_discussion_board_citizen_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: parentComment.id,
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  });
  const replies = await Promise.all(replyPromises);
  // Step 4: Validate paginated replies with limit=20
  const limit = 20;
  const firstPageResult: IPageIDiscussionBoardArticleCommentReply.ISummary =
    await api.functional.discussionBoard.comments.replies.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardArticleCommentReply.IRequest,
      },
    );
  typia.assert(firstPageResult);
  // Validate first page metadata
  TestValidator.equals(
    "first page should have 20 records",
    firstPageResult.data.length,
    limit,
  );
  TestValidator.equals(
    "first page should have current page 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page should have limit 20",
    firstPageResult.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "first page should have 50 total records",
    firstPageResult.pagination.records,
    replies.length,
  );
  TestValidator.equals(
    "first page should have 3 total pages",
    firstPageResult.pagination.pages,
    Math.ceil(replies.length / limit),
  );
  // Validate that all data on first page belongs to parent comment
  for (const reply of firstPageResult.data) {
    TestValidator.equals(
      "reply should belong to parent comment",
      reply.id,
      replies.find((r) => r.id === reply.id)?.id,
    );
  }
  // Step 5: Validate second page
  const secondPageResult: IPageIDiscussionBoardArticleCommentReply.ISummary =
    await api.functional.discussionBoard.comments.replies.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 2,
          limit: limit,
        } satisfies IDiscussionBoardArticleCommentReply.IRequest,
      },
    );
  typia.assert(secondPageResult);
  // Validate second page metadata
  TestValidator.equals(
    "second page should have 20 records",
    secondPageResult.data.length,
    limit,
  );
  TestValidator.equals(
    "second page should have current page 2",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page should have limit 20",
    secondPageResult.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "second page should have 50 total records",
    secondPageResult.pagination.records,
    replies.length,
  );
  TestValidator.equals(
    "second page should have 3 total pages",
    secondPageResult.pagination.pages,
    Math.ceil(replies.length / limit),
  );
  // Validate that all data on second page belongs to parent comment
  for (const reply of secondPageResult.data) {
    TestValidator.equals(
      "reply should belong to parent comment",
      reply.id,
      replies.find((r) => r.id === reply.id)?.id,
    );
  }
  // Step 6: Validate third page (has only 10 items)
  const thirdPageResult: IPageIDiscussionBoardArticleCommentReply.ISummary =
    await api.functional.discussionBoard.comments.replies.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 3,
          limit: limit,
        } satisfies IDiscussionBoardArticleCommentReply.IRequest,
      },
    );
  typia.assert(thirdPageResult);
  // Validate third page metadata
  TestValidator.equals(
    "third page should have 10 records (remaining)",
    thirdPageResult.data.length,
    replies.length % limit,
  );
  TestValidator.equals(
    "third page should have current page 3",
    thirdPageResult.pagination.current,
    3,
  );
  TestValidator.equals(
    "third page should have limit 20",
    thirdPageResult.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "third page should have 50 total records",
    thirdPageResult.pagination.records,
    replies.length,
  );
  TestValidator.equals(
    "third page should have 3 total pages",
    thirdPageResult.pagination.pages,
    Math.ceil(replies.length / limit),
  );
  // Validate that all data on third page belongs to parent comment
  for (const reply of thirdPageResult.data) {
    TestValidator.equals(
      "reply should belong to parent comment",
      reply.id,
      replies.find((r) => r.id === reply.id)?.id,
    );
  }
  // Ensure no duplication or missing items
  const allRepliesFromPages = [
    ...firstPageResult.data,
    ...secondPageResult.data,
    ...thirdPageResult.data,
  ];
  TestValidator.equals(
    "total replies across pages should equal total created",
    allRepliesFromPages.length,
    replies.length,
  );
  // Check for uniqueness of replies
  const uniqueReplyIds = Array.from(
    new Set(allRepliesFromPages.map((r) => r.id)),
  );
  TestValidator.equals(
    "all replies should be unique",
    uniqueReplyIds.length,
    allRepliesFromPages.length,
  );
  // Validate that all created replies are present in pages
  const createdIds = replies.map((r) => r.id);
  const foundIds = allRepliesFromPages.map((r) => r.id);
  for (const id of createdIds) {
    TestValidator.predicate(
      "created reply id should be found in response",
      foundIds.includes(id),
    );
  }
  // Validate that no unexpected replies exist
  for (const id of foundIds) {
    TestValidator.predicate(
      "response reply id should exist in created data",
      createdIds.includes(id),
    );
  }
}