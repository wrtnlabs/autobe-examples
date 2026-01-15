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

export async function test_api_comment_replies_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to establish context
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(member);
  
  // Step 2: Create an article to host the parent comment using member connection
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
  
  // Step 3: Create a parent comment on the article
  const parentComment: IDiscussionBoardArticleComment =
    await generate_random_discussion_board_citizen_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(parentComment);
  
  // Step 4: Create multiple replies as children of the parent comment
  const replyData: IDiscussionBoardArticleCommentReply.ISummary[] = [];
  
  for (let i = 0; i < 5; i++) {
    const reply: IDiscussionBoardArticleComment =
      await api.functional.discussionBoard.citizen.comments.create(
        memberConnection,
        {
          body: {
            content: `Reply ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            parent_id: parentComment.id,
          } satisfies IDiscussionBoardArticleComment.ICreate,
        },
      );
    typia.assert(reply);
    
    // Convert to summary format: extract required fields from reply
    // Note: reply created_at and reply.author.id are available on the returned object
    const summary: IDiscussionBoardArticleCommentReply.ISummary = {
      id: reply.id,
      content: reply.content,
      createdAt: reply.created_at,
      authorId: reply.author.id,
    };
    replyData.push(summary);
    
    // Wait to ensure server timestamp variation
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  
  // Step 5: Retrieve the replies using the index endpoint
  const response: IPageIDiscussionBoardArticleCommentReply.ISummary =
    await api.functional.discussionBoard.comments.replies.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 10, // Retrieve all replies in one page
        } satisfies IDiscussionBoardArticleCommentReply.IRequest,
      },
    );
  typia.assert(response);
  
  // Step 6: Verify order is descending by creation timestamp (newest first)
  const returnedReplies = response.data;
  
  // Verify all created replies are in the response
  TestValidator.equals(
    "total replies count",
    returnedReplies.length,
    replyData.length,
  );
  
  // Sort the created replies by createdAt in descending order
  const expectedOrder = [...replyData].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Descending: newest first
  });
  
  // Verify each reply in the response matches expected order
  for (let i = 0; i < expectedOrder.length; i++) {
    TestValidator.equals(
      "reply at position " + i + " matches expected order",
      returnedReplies[i].id,
      expectedOrder[i].id,
    );
    TestValidator.equals(
      "reply at position " + i + " creation timestamp matches",
      returnedReplies[i].createdAt,
      expectedOrder[i].createdAt,
    );
  }
  
  // Verify pagination information
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    response.pagination.records,
    replyData.length,
  );
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  
  // Verify all created replies are present
  for (const createdReply of replyData) {
    const found = returnedReplies.some((r) => r.id === createdReply.id);
    TestValidator.predicate("created reply found in response", found);
  }
  
  // Verify no extra replies are present
  for (const returnedReply of returnedReplies) {
    const exists = replyData.some((r) => r.id === returnedReply.id);
    TestValidator.predicate("returned reply exists in created list", exists);
  }
}