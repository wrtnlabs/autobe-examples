import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test moderator information retrieval with special characters in community name.
 * Validates that the system correctly converts communityName path parameter to community ID
 * and accurately maps the moderator relationship when community names contain special
 * characters, hyphens, underscores, or mixed case.
 */
export async function test_api_community_moderator_with_special_characters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberOutput);
  // 2. Create test community with special characters in name
  const communityName = "Tech-News_Hub-Community";
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Appoint test member as moderator of the community
  const moderatorAppointment =
    await api.functional.redditPlatform.member.communities.moderators.add(
      communityConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberOutput.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAppointment);
  // 4. Call target endpoint with exact community name (matching case and special characters)
  const moderatorInfo =
    await api.functional.redditPlatform.member.communities.moderators.at(
      connection,
      {
        communityName: community.name,
        userId: memberOutput.id,
      },
    );
  typia.assert(moderatorInfo);
  // 5. Validate response includes correct moderator user profile and community details
  TestValidator.equals(
    "community name in response",
    moderatorInfo.community.name,
    community.name,
  );
  TestValidator.equals(
    "moderator username in response",
    moderatorInfo.user.username,
    memberOutput.username,
  );
  TestValidator.equals(
    "moderator displayName in response",
    moderatorInfo.user.displayName,
    memberOutput.displayName,
  );
  // 6. Test with incorrect case to verify case sensitivity behavior
  const wrongCaseCommunityName =
    community.name.charAt(0).toLowerCase() + community.name.slice(1);
  const wrongCaseResult =
    await api.functional.redditPlatform.member.communities.moderators.at(
      connection,
      {
        communityName: wrongCaseCommunityName,
        userId: memberOutput.id,
      },
    );
  typia.assert(wrongCaseResult);
  TestValidator.equals(
    "case-insensitive lookup returns correct community",
    wrongCaseResult.community.name,
    community.name,
  );
}
