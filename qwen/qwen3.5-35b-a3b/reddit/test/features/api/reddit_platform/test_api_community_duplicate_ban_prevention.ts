import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_duplicate_ban_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner setup - authenticate and create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResult = await authorize_member_join(ownerConnection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerResult);
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Target user setup - authenticate as second member
  const targetConnection: api.IConnection = { host: connection.host };
  const targetResult = await authorize_member_join(targetConnection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(targetResult);
  // 3. Target user subscribes to community (required for ban operation)
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      targetConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. First ban attempt - owner bans target user
  const firstBan =
    await generate_random_reddit_platform_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          user_id: targetResult.id,
          expires_at: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(firstBan);
  TestValidator.predicate("first ban is permanent", firstBan.isPermanent);
  // 5. Second ban attempt - should fail with duplicate conflict
  await TestValidator.error(
    "duplicate ban should fail with conflict error",
    async () => {
      await generate_random_reddit_platform_member_communities_bans_create(
        ownerConnection,
        {
          body: {
            user_id: targetResult.id,
            expires_at: null,
          } satisfies IRedditPlatformCommunityBan.ICreate,
          params: {
            communityId: community.id,
          },
        },
      );
    },
  );
  // 6. Verify only one ban record exists for this user
  const bansPage = await api.functional.redditPlatform.member.bans.index(
    ownerConnection,
    {
      body: {
        userId: targetResult.id,
        limit: 100,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(bansPage);
  TestValidator.equals(
    "ban list should contain exactly one record",
    bansPage.data.length,
    1,
  );
  TestValidator.equals(
    "ban record id should match first ban",
    bansPage.data[0]?.id,
    firstBan.id,
  );
  TestValidator.equals(
    "ban should be associated with correct community",
    bansPage.data[0]?.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban should be associated with correct banned user",
    bansPage.data[0]?.user.id,
    targetResult.id,
  );
}
