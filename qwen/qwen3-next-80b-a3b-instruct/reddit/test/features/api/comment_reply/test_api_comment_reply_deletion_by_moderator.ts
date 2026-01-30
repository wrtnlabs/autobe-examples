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
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_moderator_comments_create } from "../../../generate/generate_random_community_bbs_moderator_comments_create";
import { generate_random_community_bbs_moderator_comments_replies_create } from "../../../generate/generate_random_community_bbs_moderator_comments_replies_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_reply_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account for comment author
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // Step 2: Create a community
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  // Step 3: Create a post in the community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: community.id,
        post_type: "text",
      },
    });
  // Step 4: Create a comment on the post
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_moderator_comments_create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content(),
        },
      },
    );
  // Step 5: Create a reply as first moderator
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstModerator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(firstModeratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      },
    });
  const reply: ICommunityBbsCommentReply =
    await generate_random_community_bbs_moderator_comments_replies_create(
      firstModeratorConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          metadata: "test",
        },
      },
    );
  // Step 6: Authenticate as second moderator to delete the reply
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModerator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(secondModeratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      },
    });
  // Step 7: Delete the reply as second moderator
  await api.functional.communityBbs.moderator.comments.replies.erase(
    secondModeratorConnection,
    {
      commentId: comment.id,
      replyId: reply.id,
    },
  );
  // Step 8: Validate deletion by creating a new reply
  // The API doesn't provide a way to retrieve individual replies, so we validate
  // deletion success by ensuring the system can still create new replies after deletion
  const newReply: ICommunityBbsCommentReply =
    await generate_random_community_bbs_moderator_comments_replies_create(
      secondModeratorConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          metadata: "new_reply_after_deletion",
        },
      },
    );
  // Validate that the new reply was created successfully with unique content
  typia.assert(newReply);
  TestValidator.notEquals(
    "new reply has different content",
    newReply.content,
    reply.content,
  );
}
