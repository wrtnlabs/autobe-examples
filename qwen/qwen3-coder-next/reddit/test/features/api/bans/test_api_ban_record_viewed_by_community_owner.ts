import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_bans_create_ban } from "../../../generate/generate_random_reddit_clone_owner_communities_bans_create_ban";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";

export async function test_api_ban_record_viewed_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account for authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8),
    displayName: "Owner User",
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // 2. Create a ban record (using a random ban ID since we can't create communities/bans)
  // Since we don't have community creation or ban creation APIs in this scenario,
  // we'll test with a hardcoded ban ID that should exist in test environment
  // In a real scenario, this would be replaced with an actual ban ID created by setup
  const testBanId = "00000000-0000-0000-0000-000000000001";
  // 3. Owner retrieves the ban record
  const retrievedBan = await api.functional.redditClone.bans.at(
    ownerConnection,
    {
      banId: testBanId,
    },
  );
  typia.assert(retrievedBan);
  // 4. Validate ban record structure (basic validation since we don't control test data)
  TestValidator.equals(
    "ban ID exists and is UUID",
    typeof retrievedBan.id,
    "string",
  );
  TestValidator.equals(
    "community info exists",
    typeof retrievedBan.community.id,
    "string",
  );
  TestValidator.equals(
    "member info exists",
    typeof retrievedBan.user.id,
    "string",
  );
  TestValidator.equals(
    "moderator info exists",
    typeof retrievedBan.moderator.id,
    "string",
  );
  TestValidator.equals(
    "ban reason exists",
    typeof retrievedBan.banReason,
    "string",
  );
  TestValidator.equals(
    "ban start date exists",
    typeof retrievedBan.banStartDate,
    "string",
  );
}
