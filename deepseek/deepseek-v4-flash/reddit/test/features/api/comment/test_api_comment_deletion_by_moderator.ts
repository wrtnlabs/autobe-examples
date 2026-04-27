import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that a moderator can delete another member's comment within their moderated community.
 *
 * Registers two members, creates a community, appoints one as moderator, and validates that the moderator can successfully delete a comment authored by the other member. Confirms the moderator authorization path is functional.
 *
 * 1. Register member1 (post/comment author) via `authorize_member_join`.
 * 2. Register member2 (moderator) via `authorize_member_join`.
 * 3. Member1 creates a community via `generate_random_community_platform_member_communities_create`.
 * 4. Member1 appoints member2 as moderator via `generate_random_community_platform_member_moderators_create`.
 * 5. Member1 subscribes to the community via `generate_random_community_platform_member_communities_subscribers_create`.
 * 6. Member1 creates a text post via `generate_random_community_platform_member_posts_create`.
 * 7. Member1 creates a comment on the post via `generate_random_community_platform_member_posts_comments_create`.
 * 8. Member2 deletes the comment via `api.functional.communityPlatform.member.posts.comments.erase`.
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member1 (author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      username: `author-${RandomGenerator.alphabets(8)}`,
    },
  });
  typia.assert(member1Auth);
  // 2. Register member2 (moderator)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      username: `mod-${RandomGenerator.alphabets(8)}`,
    },
  });
  typia.assert(member2Auth);
  // 3. Member1 creates a community (becomes owner)
  const communityName = `test-community-${RandomGenerator.alphabets(8)}`;
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: communityName,
        },
      },
    );
  typia.assert(community);
  // 4. Member1 appoints member2 as moderator
  const moderator =
    await generate_random_community_platform_member_moderators_create(
      member1Connection,
      {
        body: {
          communityName: communityName,
          memberUsername: member2Auth.username,
        },
      },
    );
  typia.assert(moderator);
  // 5. Member1 subscribes to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      member1Connection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 6. Member1 creates a text post
  const post = await generate_random_community_platform_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 7. Member1 creates a top-level comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(comment);
  // 8. Member2 (moderator) deletes member1's comment
  await api.functional.communityPlatform.member.posts.comments.erase(
    member2Connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
}
