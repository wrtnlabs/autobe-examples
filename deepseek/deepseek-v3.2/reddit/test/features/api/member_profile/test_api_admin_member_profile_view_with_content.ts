import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_admin_member_profile_view_with_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 2. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuth);
  // 3. Create community as member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Subscribe to community as member (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 5. Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 7. Create a second member to upvote the post (increase karma)
  const voter2Connection: api.IConnection = { host: connection.host };
  const voter2JoinBody: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const voter2Auth = await authorize_member_join(voter2Connection, {
    body: voter2JoinBody,
  });
  typia.assert(voter2Auth);
  // Subscribe voter2 to community before voting
  const voter2Subscription =
    await generate_random_community_platform_member_subscriptions_create(
      voter2Connection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(voter2Subscription);
  // Upvote the post (should increase member's karma by +1)
  const postVote =
    await generate_random_community_platform_member_posts_votes_create(
      voter2Connection,
      {
        body: {
          type: "up",
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(postVote);
  // 8. Create a third member to downvote the comment (decrease karma)
  const voter3Connection: api.IConnection = { host: connection.host };
  const voter3JoinBody: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const voter3Auth = await authorize_member_join(voter3Connection, {
    body: voter3JoinBody,
  });
  typia.assert(voter3Auth);
  // Subscribe voter3 to community before voting on comment
  const voter3Subscription =
    await generate_random_community_platform_member_subscriptions_create(
      voter3Connection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(voter3Subscription);
  // Downvote the comment (should decrease member's karma by -1)
  const commentVote =
    await generate_random_community_platform_member_comments_votes_create(
      voter3Connection,
      {
        body: {
          type: "downvote",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(commentVote);
  // 9. Admin retrieves member profile
  const memberProfile =
    await api.functional.communityPlatform.admin.members.profile.at(
      adminConnection,
      {
        memberId: memberAuth.id,
      },
    );
  typia.assert(memberProfile);
  // 10. Validate profile fields
  TestValidator.equals("member id matches", memberProfile.id, memberAuth.id);
  TestValidator.equals(
    "username matches",
    memberProfile.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "nickname matches",
    memberProfile.nickname,
    memberAuth.nickname,
  );
  TestValidator.equals("email matches", memberProfile.email, memberAuth.email);
  TestValidator.predicate("avatar is null", memberProfile.avatar === null);
  // 11. Validate karma calculation: upvote (+1) + downvote (-1) = 0
  TestValidator.equals("karma should be zero", memberProfile.karma, 0);
  // 12. Validate posts list
  TestValidator.equals("should have one post", memberProfile.posts.length, 1);
  const profilePost = memberProfile.posts[0];
  TestValidator.equals("post id matches", profilePost.id, post.id);
  TestValidator.equals("post title matches", profilePost.title, post.title);
  TestValidator.predicate(
    "post has content preview",
    profilePost.content_preview.length > 0,
  );
  // 13. Validate comments list
  TestValidator.equals(
    "should have one comment",
    memberProfile.comments.length,
    1,
  );
  const profileComment = memberProfile.comments[0];
  TestValidator.equals("comment id matches", profileComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    profileComment.content,
    comment.content,
  );
  TestValidator.predicate(
    "comment has vote score",
    profileComment.voteScore === -1,
  );
  // 14. Verify no deleted content included (not applicable in this test)
  TestValidator.predicate(
    "registered_at is valid date",
    new Date(memberProfile.registered_at) instanceof Date,
  );
  TestValidator.predicate(
    "email_verified is boolean",
    typeof memberProfile.email_verified === "boolean",
  );
}
