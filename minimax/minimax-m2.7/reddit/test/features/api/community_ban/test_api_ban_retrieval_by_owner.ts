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

export async function test_api_ban_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (who will own the community)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditCloneMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {},
  );
  // 2. Create community with member A as owner
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Authenticate as member B (who will be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditCloneMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {},
  );
  // 4. Create ban for member B in the community by owner member A
  const ban: IRedditCloneCommunityBan =
    await generate_random_reddit_clone_member_communities_bans_create(
      memberAConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          redditCloneUserId: memberB.id,
        },
        params: {
          communityCode: community.name,
        },
      },
    );
  // 5. Retrieve the ban as owner using GET /redditClone/member/communities/{communityId}/bans/{banId}
  // Note: memberAConnection is already authenticated as the community owner
  const retrievedBan: IRedditCloneCommunityBan =
    await api.functional.redditClone.member.communities.bans.at(
      memberAConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  // Validate response with typia.assert()
  typia.assert(retrievedBan);
  // Validate ban details
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals("reason matches", retrievedBan.reason, ban.reason);
  TestValidator.equals(
    "banned user id matches",
    retrievedBan.bannedUser.id,
    memberB.id,
  );
  TestValidator.equals(
    "issuer id matches owner",
    retrievedBan.issuer.id,
    memberA.id,
  );
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "deletedAt is null (ban is active)",
    retrievedBan.deletedAt,
    null,
  );
  TestValidator.predicate(
    "expiresAt is null (permanent ban) or valid timestamp",
    retrievedBan.expiresAt === null ||
      typeof retrievedBan.expiresAt === "string",
  );
}
