import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
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

export async function test_api_community_engagement_empty_community(
  connection: api.IConnection,
) {
  // Create actor-specific connections
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IRedditPlatformMember.IJoin>();
  await authorize_member_join(memberConnection, {
    body: memberData,
  });
  // Create a new community with no activity yet
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: `test-community-${typia.random<string & tags.Format<"uuid">>()}`,
          description: "Test community for engagement metrics",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Test engagement endpoint on fresh community
  const engagement =
    await api.functional.redditPlatform.member.communities.engagement(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(engagement);
  // Validate engagement metrics for empty community
  TestValidator.equals(
    "engagement has community",
    engagement.community?.id,
    community.id,
  );
  TestValidator.equals(
    "engagement has correct community name",
    engagement.community?.name,
    community.name,
  );
  TestValidator.predicate(
    "engagement has user information",
    engagement.user.id !== undefined,
  );
  TestValidator.equals(
    "engagement feed type is community",
    engagement.feedType,
    "community",
  );
  TestValidator.equals(
    "engagement community ID matches",
    engagement.communityId,
    community.id,
  );
}
