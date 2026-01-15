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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_comment } from "../../../prepare/prepare_random_discussion_board_article_comment";
import { prepare_random_discussion_board_article_comment_reply } from "../../../prepare/prepare_random_discussion_board_article_comment_reply";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { generate_random_discussion_board_citizen_articles_comments_create } from "../../../generate/generate_random_discussion_board_citizen_articles_comments_create";
import { generate_random_discussion_board_citizen_comments_replies_create } from "../../../generate/generate_random_discussion_board_citizen_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_reply_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create citizen connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(citizen);
  // Step 2: Create article
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenConnection,
      {},
    );
  typia.assert(article);
  // Step 3: Create parent comment
  const comment: IDiscussionBoardArticleComment =
    await generate_random_discussion_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardArticleComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 4: Create reply to comment
  const createdReply: IDiscussionBoardArticleCommentReply =
    await generate_random_discussion_board_citizen_comments_replies_create(
      citizenConnection,
      {
        params: { commentId: comment.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: comment.id,
          citizen_id: citizen.id,
        } satisfies IDiscussionBoardArticleCommentReply.ICreate,
      },
    );
  typia.assert(createdReply);
  // Step 5: Retrieve the specific reply
  const retrievedReply: IDiscussionBoardArticleCommentReply =
    await api.functional.discussionBoard.comments.replies.at(
      citizenConnection,
      {
        commentId: comment.id,
        replyId: createdReply.id,
      },
    );
  typia.assert(retrievedReply);
  // Step 6: Validate that retrieved reply matches created reply
  TestValidator.equals("reply id matches", retrievedReply.id, createdReply.id);
  TestValidator.equals(
    "reply content matches",
    retrievedReply.content,
    createdReply.content,
  );
  TestValidator.equals(
    "reply created_at matches",
    retrievedReply.created_at,
    createdReply.created_at,
  );
  TestValidator.equals(
    "reply updated_at matches",
    retrievedReply.updated_at,
    createdReply.updated_at,
  );
  TestValidator.equals(
    "reply visibility matches",
    retrievedReply.visibility,
    createdReply.visibility,
  );
  TestValidator.equals(
    "reply status matches",
    retrievedReply.status,
    createdReply.status,
  );
}
