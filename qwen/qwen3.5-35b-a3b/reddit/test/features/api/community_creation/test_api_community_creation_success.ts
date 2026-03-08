import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
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
        referrer:
          typia.random<string & tags.Format<"uri">>() ??
          "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  // 2. Create a new community with authenticated member using utility function
  // This follows the utility function priority rule - use generate_random_reddit_platform_member_communities_create
  // instead of direct api.functional.redditPlatform.member.communities.create call
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  // 3. Validate response structure with typia.assert (complete type validation)
  typia.assert(community);
  // 4. Verify owner is the authenticated member
  TestValidator.equals(
    "owner id matches authenticated member id",
    community.owner.id,
    member.id,
  );
  TestValidator.equals(
    "owner username matches authenticated member",
    community.owner.username,
    member.username,
  );
  TestValidator.equals(
    "owner display name matches authenticated member",
    community.owner.displayName,
    member.displayName,
  );
  // 5. Verify initial subscriber count is 0
  TestValidator.equals(
    "subscriber count is initialized to 0",
    community.subscriber_count,
    0,
  );
  // 6. Verify deleted_at is null for active community
  TestValidator.equals(
    "community is not deleted (deleted_at is null)",
    community.deleted_at,
    null,
  );
  // 7. Verify relationship arrays are empty initially
  TestValidator.equals(
    "subscriptions array is empty initially",
    community.subscriptions.length,
    0,
  );
  TestValidator.equals(
    "moderators array is empty initially",
    community.moderators.length,
    0,
  );
  TestValidator.equals(
    "bans array is empty initially",
    community.bans.length,
    0,
  );
  // 8. Verify icon_url format if provided
  if (community.icon_url !== null) {
    // typia.assert() already validated URI format, just check it exists
    TestValidator.predicate(
      "icon_url is provided when set",
      community.icon_url !== null && community.icon_url !== undefined,
    );
  }
}
