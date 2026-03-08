import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_community_ban_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(ownerAuth);
  // 2. Owner creates community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(moderatorAuth);
  // 4. Owner assigns moderator to community
  const moderatorAssignment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: moderatorAuth.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create member who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(bannedMemberAuth);
  // 6. Owner creates ban record for the member
  const banRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          reddit_platform_member_id: bannedMemberAuth.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // 7. Moderator retrieves the ban record
  const retrievedBan =
    await api.functional.redditPlatform.member.communities.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: banRecord.id,
      },
    );
  typia.assert(retrievedBan);
  // 8. Validate ban record structure
  TestValidator.equals("ban id matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned member id matches",
    retrievedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "bannedBy id matches owner",
    retrievedBan.bannedBy.id,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedBan.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedBan.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null for active ban",
    retrievedBan.deleted_at === null,
  );
}