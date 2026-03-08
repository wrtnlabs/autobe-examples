import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_member_profile_display_name_propagation(
  connection: api.IConnection,
): Promise<void> {
  // Setup 1: Create member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Store initial display name
  const initialDisplayName = memberAuth.displayName;
  // Setup 2: Create community using the same connection (token already set)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_-]+$">
          >(),
        },
      },
    );
  typia.assert(community);
  // Setup 3: Subscribe to community
  await generate_random_reddit_platform_member_communities_subscribe(
    connection,
    {
      body: { confirmSubscription: true },
      params: { communityId: community.id },
    },
  );
  // Data Creation 1: Create first post
  const post1 = await generate_random_reddit_platform_member_posts_create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post1);
  // Data Creation 2: Create comment on first post
  const comment = await generate_random_reddit_platform_member_comments_create(
    connection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post1.id,
      },
    },
  );
  typia.assert(comment);
  // Data Creation 3: Create second post
  const post2 = await generate_random_reddit_platform_member_posts_create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post2);
  // Profile Update: Change display name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.redditPlatform.member.profile.update(connection, {
      body: { display_name: newDisplayName },
    });
  typia.assert(updatedProfile);
  // Validation 1: Verify profile has new display name
  TestValidator.equals(
    "profile display name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // Validation 2: Verify old display name is no longer present
  TestValidator.notEquals(
    "old display name removed",
    updatedProfile.displayName,
    initialDisplayName,
  );
}
