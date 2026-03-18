import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_comments_create } from "../../../generate/generate_random_community_platform_member_comments_create";
import { generate_random_community_platform_member_comments_vote_create } from "../../../generate/generate_random_community_platform_member_comments_vote_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

export async function test_api_comment_vote_create_and_replace(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string>(),
      displayName: typia.random<string>(),
      bio: typia.random<string | null>(),
      avatarImageUri: typia.random<(string & tags.Format<"uri">) | null>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
          iconImageUrl: typia.random<string & tags.Format<"url">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          subscriptionStatus: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: typia.random<string>(),
        contentType: "text",
        text: {
          body: true,
        } satisfies ICommunityPlatformPostText,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const comment =
    await generate_random_community_platform_member_comments_create(
      memberConnection,
      {
        body: {
          community_platform_post_id: post.id,
          content: typia.random<string>(),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  const upvote =
    await generate_random_community_platform_member_comments_vote_create(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: {
          direction: 1,
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("initial comment vote direction", upvote.direction, 1);
  TestValidator.equals("initial vote is active", upvote.deletedAt, null);
  TestValidator.equals(
    "initial vote member id is present",
    upvote.communityPlatformMemberId,
    member.id,
  );
  const replaced =
    await generate_random_community_platform_member_comments_vote_create(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: {
          direction: -1,
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(replaced);
  TestValidator.equals(
    "replaced comment vote direction",
    replaced.direction,
    -1,
  );
  TestValidator.equals("replaced vote is active", replaced.deletedAt, null);
  TestValidator.equals(
    "replaced vote member id is present",
    replaced.communityPlatformMemberId,
    member.id,
  );
  TestValidator.notEquals(
    "vote direction should change after replacement",
    upvote.direction,
    replaced.direction,
  );
}
