import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformActivity";
import type { IRedditPlatformActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformActivity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_admin_activity_data_consistency(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account (for querying activity history)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Create member account (for generating activities)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Step 3: Admin creates a community for member to interact with
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection2,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<300>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Member subscribes to the community (generates COMMUNITY_SUBSCRIBED activity)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Step 5: Member creates a post (generates POST_CREATED activity)
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Member creates a comment on the post (generates COMMENT_CREATED activity)
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
        post_id: post.id,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // Step 7: Query activity history with no filters - verify activities exist
  const adminConnection3: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection3, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const activityRequest = {} satisfies IRedditPlatformActivity.IRequest;
  const activityResponse =
    await api.functional.redditPlatform.admin.histories.index(
      adminConnection3,
      {
        body: activityRequest,
      },
    );
  typia.assert(activityResponse);
  // Verify activities exist
  TestValidator.equals(
    "activity data exists",
    activityResponse.data.length > 0,
    true,
  );
  TestValidator.equals(
    "activity records count matches expected",
    activityResponse.data.length,
    3,
  );
  // Step 8: Verify multiple activity types are present (POST_CREATED, COMMENT_CREATED, COMMUNITY_SUBSCRIBED)
  const activityTypes = activityResponse.data.map((a) => a.activity_type);
  TestValidator.equals(
    "contains POST_CREATED activity",
    activityTypes.includes("POST_CREATED"),
    true,
  );
  TestValidator.equals(
    "contains COMMENT_CREATED activity",
    activityTypes.includes("COMMENT_CREATED"),
    true,
  );
  TestValidator.equals(
    "contains COMMUNITY_SUBSCRIBED activity",
    activityTypes.includes("COMMUNITY_SUBSCRIBED"),
    true,
  );
  // Step 9: Verify actor references are correct (actor should be the member who performed actions)
  const actorIds = activityResponse.data.map((a) => a.actor.id);
  TestValidator.equals(
    "all activities reference correct member",
    actorIds.every((id) => id === member.id),
    true,
  );
  // Step 10: Create a fresh admin with no activities to test empty result
  const freshAdminEmail = typia.random<string & tags.Format<"email">>();
  const freshAdminPassword = RandomGenerator.alphaNumeric(16);
  const freshAdminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const freshAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(freshAdminConnection, {
    body: {
      email: freshAdminEmail,
      password: freshAdminPassword,
      username: freshAdminUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const freshAdminLogin: api.IConnection = { host: connection.host };
  await authorize_admin_login(freshAdminLogin, {
    body: {
      email: freshAdminEmail,
      password: freshAdminPassword,
    },
  });
  // Step 11: Query activity history for admin with no activities
  const emptyActivityResponse =
    await api.functional.redditPlatform.admin.histories.index(freshAdminLogin, {
      body: {},
    });
  typia.assert(emptyActivityResponse);
  // Verify empty result with correct pagination metadata
  TestValidator.equals(
    "empty data array",
    emptyActivityResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty pagination records",
    emptyActivityResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    emptyActivityResponse.pagination.pages,
    0,
  );
  // Step 12: Verify activity entity references are correct
  // Each activity should have correct entity_type and entity_id matching what was created
  const entityTypes = activityResponse.data.map((a) => a.entity_type);
  TestValidator.equals(
    "entity types are correct",
    entityTypes.includes("POST") &&
      entityTypes.includes("COMMENT") &&
      entityTypes.includes("COMMUNITY"),
    true,
  );
  // Step 13: Verify pagination structure
  TestValidator.equals(
    "pagination has valid current page",
    activityResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    activityResponse.pagination.limit > 0,
  );
}
