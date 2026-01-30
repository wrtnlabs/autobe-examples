import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReply";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_comments_replies_create } from "../../../generate/generate_random_community_bbs_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_reply_update_denied_for_non_author(
  connection: api.IConnection,
) {
  // Step 1: Authenticate first member who will create the comment and reply
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(author);
  // Step 2: Create a comment owned by the first member
  const comment = await generate_random_community_bbs_member_comments_create(
    authorConnection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityBbsComment.ICreate,
    },
  );
  typia.assert(comment);
  // Step 3: Create a reply owned by the first member
  const reply =
    await generate_random_community_bbs_member_comments_replies_create(
      authorConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {},
      },
    );
  typia.assert(reply);
  // Step 4: Authenticate second member who will attempt unauthorized update
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  const nonAuthor = await authorize_member_join(nonAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(nonAuthor);
  // Step 5: Attempt to update the reply with valid data but from non-author connection
  // This should fail with 403 Forbidden
  await TestValidator.error("non-author cannot update reply", async () => {
    await api.functional.communityBbs.member.comments.replies.update(
      nonAuthorConnection,
      {
        commentId: comment.id,
        replyId: reply.id,
        body: {
          content: "Updated content by non-author",
          status: "active",
        } satisfies ICommunityBbsCommentReply.IUpdate,
      },
    );
  });
}
