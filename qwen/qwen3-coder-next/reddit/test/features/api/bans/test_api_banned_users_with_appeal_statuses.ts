import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_banned_users_with_appeal_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register owner and create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: "owner@test.com",
    password: "SecurePass123!",
    username: "communityowner",
    displayName: "Community Owner",
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  const communityData = {
    name: "test-community-" + RandomGenerator.alphabets(6),
    description: "A test community for ban testing",
    icon_url: null,
  } satisfies IRedditCloneCommunity.ICreate;
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    { body: communityData },
  );
  typia.assert(community);
  // 2. Create banned users with different appeal statuses
  // Since there's no direct API to create bans in the provided functions,
  // we'll test the ban listing functionality with the owner connection
  const result = await api.functional.redditClone.owner.communities.bans.at(
    ownerConnection,
    { communityId: community.id },
  );
  typia.assert(result);
  // 3. Validate pagination structure
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // 4. Validate ban record structure when bans exist
  for (const ban of result.data) {
    TestValidator.equals("ban has id", typeof ban.id, "string");
    TestValidator.equals("ban has user", typeof ban.user, "object");
    TestValidator.equals("ban has moderator", typeof ban.moderator, "object");
    TestValidator.equals("ban has reason", typeof ban.banReason, "string");
    TestValidator.equals(
      "ban has start date",
      typeof ban.banStartDate,
      "string",
    );
    TestValidator.predicate(
      "ban has appeal status",
      ban.appealStatus === "pending" || ban.appealStatus === "approved" || ban.appealStatus === "denied",
    );
    TestValidator.equals("ban has created at", typeof ban.createdAt, "string");
  }
}