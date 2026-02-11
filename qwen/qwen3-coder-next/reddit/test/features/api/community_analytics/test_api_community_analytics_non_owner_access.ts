import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function test_api_community_analytics_non_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // Create member connections for testing
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  const viewerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // Create community owned by first member
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url:
            RandomGenerator.alphabets(3) === "jpg"
              ? "https://example.com/icon.jpg"
              : null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Non-owner member accesses analytics
  const analytics =
    await api.functional.redditPlatform.member.communities.analytics.at(
      viewerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(analytics);
  // Validate analytics structure
  TestValidator.equals(
    "community ID matches",
    analytics.communityId,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    analytics.communityName,
    community.name,
  );
  TestValidator.predicate(
    "engagement data exists",
    analytics.engagement.viewCount >= 0,
  );
  TestValidator.predicate(
    "content data exists",
    analytics.content.postCount >= 0,
  );
  TestValidator.predicate(
    "users data exists",
    analytics.users.memberCount >= 0,
  );
  TestValidator.predicate(
    "growth data exists",
    analytics.growth.newMembers >= 0,
  );
}
