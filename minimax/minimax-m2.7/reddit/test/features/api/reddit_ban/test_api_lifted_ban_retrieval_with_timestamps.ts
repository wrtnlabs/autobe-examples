import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

export async function test_api_lifted_ban_retrieval_with_timestamps(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A who will own the community and issue/lift ban
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create community with member A as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate as member B who will be banned and unbanned
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Create ban for member B in the community by owner member A
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    memberAConnection,
    {
      params: { communityCode: community.name },
      body: {
        redditCloneUserId: memberB.id,
        reason: "Test ban for unban verification",
      },
    },
  );
  typia.assert(ban);
  // Store original timestamps for comparison
  const createdAt = ban.createdAt;
  // 5. Lift the ban using PUT endpoint to unbanned state
  const unbanResponse =
    await api.functional.redditClone.member.communities.bans.update(
      memberAConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          reason: "User was unbanned for testing",
        } satisfies IRedditCloneCommunityBan.IUpdate,
      },
    );
  typia.assert(unbanResponse);
  // 6. Retrieve the lifted ban using GET endpoint
  const retrievedBan =
    await api.functional.redditClone.member.communities.bans.at(
      memberAConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // Validate temporal details
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "community matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned user matches",
    retrievedBan.bannedUser.id,
    memberB.id,
  );
  TestValidator.equals("issuer matches", retrievedBan.issuer.id, memberA.id);
  TestValidator.equals(
    "reason preserved",
    retrievedBan.reason,
    "Test ban for unban verification",
  );
  // Validate temporal tracking for audit trail
  TestValidator.predicate(
    "deletedAt is set after unban",
    retrievedBan.deletedAt !== null,
  );
  TestValidator.predicate(
    "updatedAt is after createdAt",
    new Date(retrievedBan.updatedAt) > new Date(createdAt),
  );
  TestValidator.predicate(
    "deletedAt is after createdAt",
    new Date(retrievedBan.deletedAt!) > new Date(createdAt),
  );
  // Verify updatedAt reflects the unban action
  TestValidator.predicate(
    "updatedAt >= deletedAt",
    new Date(retrievedBan.updatedAt) >= new Date(retrievedBan.deletedAt!),
  );
}
