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

export async function test_api_community_moderator_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first test member (community owner) and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResponse = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerResponse);
  const ownerId = ownerResponse.id;
  // 2. Create test community owned by first member
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityName = community.name;
  const communityId = community.id;
  // 3. Create second test member to be appointed as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorResponse = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorResponse);
  const moderatorId = moderatorResponse.id;
  // 4. Appoint second member as moderator of the community
  await api.functional.redditPlatform.member.communities.moderators.add(
    ownerConnection,
    {
      communityId: communityId,
      body: {
        user_id: moderatorId,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 5. Call the target endpoint to retrieve the moderator information
  const moderatorInfo: IRedditPlatformModeratorHistory =
    await api.functional.redditPlatform.member.communities.moderators.at(
      connection,
      {
        communityName: communityName,
        userId: moderatorId,
      },
    );
  typia.assert(moderatorInfo);
  // 6. Verify the response includes the correct user profile
  TestValidator.equals(
    "moderator username",
    moderatorInfo.user.username,
    moderatorResponse.username,
  );
  TestValidator.equals(
    "moderator displayName",
    moderatorInfo.user.displayName,
    moderatorResponse.displayName,
  );
  TestValidator.equals(
    "moderator karmaScore",
    moderatorInfo.user.karmaScore,
    moderatorResponse.karmaScore,
  );
  TestValidator.equals(
    "moderator avatarUrl",
    moderatorInfo.user.avatarUrl,
    moderatorResponse.avatarUrl,
  );
  // 7. Verify the response includes correct community details
  TestValidator.equals(
    "community name",
    moderatorInfo.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description",
    moderatorInfo.community.description,
    community.description,
  );
  TestValidator.equals(
    "community subscriberCount",
    moderatorInfo.community.subscriber_count,
    community.subscriber_count,
  );
  TestValidator.equals(
    "community iconUrl",
    moderatorInfo.community.icon_url,
    community.icon_url,
  );
  // 8. Verify the created_at timestamp is a valid date-time format
  typia.assert(moderatorInfo.createdAt);
  const createdAt = new Date(moderatorInfo.createdAt);
  TestValidator.predicate(
    "created_at is valid date",
    createdAt instanceof Date && !isNaN(createdAt.getTime()),
  );
  // 9. Verify that community does not include moderator list (prevents circular reference)
  // Note: ISummary type does not include moderators field at all
  TestValidator.predicate(
    "community ISummary excludes moderators field",
    !("moderators" in moderatorInfo.community),
  );
}