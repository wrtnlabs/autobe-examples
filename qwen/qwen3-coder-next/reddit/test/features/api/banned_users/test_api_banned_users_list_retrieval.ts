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

export async function test_api_banned_users_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    displayName: `Owner ${RandomGenerator.name()}`,
  } satisfies IRedditCloneOwner.IJoin;
  const authorizedOwner = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(authorizedOwner);
  // 2. Create community
  const communityData = {
    name: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: null,
  } satisfies IRedditCloneCommunity.ICreate;
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: communityData,
    },
  );
  typia.assert(community);
  // 3. Retrieve banned users list (even if empty)
  const bannedList = await api.functional.redditClone.owner.communities.bans.at(
    ownerConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(bannedList);
  // 4. Validate banned users list structure
  TestValidator.equals(
    "ban list is an array",
    Array.isArray(bannedList.data),
    true,
  );
  TestValidator.predicate(
    "has pagination info",
    bannedList.pagination !== undefined,
  );
  TestValidator.predicate(
    "has correct pagination fields",
    bannedList.pagination.current >= 1 &&
      bannedList.pagination.limit >= 0 &&
      bannedList.pagination.records >= 0 &&
      bannedList.pagination.pages >= 0,
  );
  // 5. Validate ban items structure if any exist
  if (bannedList.data.length > 0) {
    bannedList.data.forEach((ban) => {
      typia.assert(ban);
      // Validate user details
      TestValidator.equals(
        "user has id",
        typeof ban.user.id === "string",
        true,
      );
      TestValidator.equals(
        "user has username",
        typeof ban.user.username === "string",
        true,
      );
      // Validate moderator details
      TestValidator.equals(
        "moderator has id",
        typeof ban.moderator.id === "string",
        true,
      );
      TestValidator.equals(
        "moderator has username",
        typeof ban.moderator.username === "string",
        true,
      );
      // Validate ban details
      TestValidator.equals(
        "ban reason exists",
        typeof ban.banReason === "string",
        true,
      );
      TestValidator.equals(
        "ban start date is valid date string",
        typeof ban.banStartDate === "string",
        true,
      );
      // Validate appeal status
      TestValidator.equals(
        "appeal status is valid",
        ["pending", "approved", "denied"].includes(ban.appealStatus),
        true,
      );
      // Validate timestamps
      TestValidator.equals(
        "created at is valid date string",
        typeof ban.createdAt === "string",
        true,
      );
    });
  }
}
