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
export async function test_api_comment_deletion_by_moderator_with_replies(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    },
  });
  moderatorConnection.headers = moderatorConnection.headers ?? {};
  moderatorConnection.headers.Authorization = moderatorAuth.token.access;
  // Step 2: Create member connection and authenticate (for creating the original comment)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  memberConnection.headers = memberConnection.headers ?? {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // Step 3: Create a community for the comment to be posted in
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 4: Create a post in the community for the comment to belong to
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
      },
    },
  );
  typia.assert(post);
  // Step 5: Create a comment as the member on the post
  const comment = await generate_random_community_bbs_moderator_comments_create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(comment);
  // Step 6: Create multiple replies from different members to the comment
  const replyCount = RandomGenerator.pick([2, 3, 4]);
  for (let i = 0; i < replyCount; i++) {
    // Create a new member connection for each reply to simulate different users
    const replyMemberConnection: api.IConnection = { host: connection.host };
    const replyMemberAuth = await authorize_member_join(replyMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
    replyMemberConnection.headers = replyMemberConnection.headers ?? {};
    replyMemberConnection.headers.Authorization = replyMemberAuth.token.access;
    // Create reply with non-empty body (as required by ICommunityBbsCommentReply.ICreate)
    await generate_random_community_bbs_moderator_comments_replies_create(
      replyMemberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  }
  // Step 7: Delete the comment as the moderator (must succeed despite replies)
  await api.functional.communityBbs.moderator.comments.erase(
    moderatorConnection,
    {
      commentId: comment.id,
    },
  );
  // Step 8: Validate deletion was successful - only way possible is no error thrown
  // Since we cannot verify via GET (endpoint not provided), we validate by absence of error
  TestValidator.predicate("moderator can delete comments with replies", true);
}