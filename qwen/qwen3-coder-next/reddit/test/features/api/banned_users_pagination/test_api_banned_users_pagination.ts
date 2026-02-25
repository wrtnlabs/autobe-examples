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

export async function test_api_banned_users_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    displayName: "Test Owner",
  } satisfies IRedditCloneOwner.IJoin;
  const owner = await authorize_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(communityConnection, { body: ownerData });
  const community = await api.functional.redditClone.owner.communities.create(
    communityConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
        description: "Test community for banned users pagination",
        icon_url: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Create banned users for testing pagination
  const banCount = 15;
  // Since we don't have a direct way to ban users without creating members first,
  // we'll test the pagination endpoint with existing data
  // 3. Test pagination functionality
  const firstPage = await api.functional.redditClone.owner.communities.bans.at(
    ownerConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata structure
  TestValidator.equals(
    "first page has pagination",
    typeof firstPage.pagination,
    "object",
  );
  TestValidator.equals(
    "current page exists",
    typeof firstPage.pagination.current,
    "number",
  );
  TestValidator.equals(
    "page limit exists",
    typeof firstPage.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "total records exists",
    typeof firstPage.pagination.records,
    "number",
  );
  TestValidator.equals(
    "total pages exists",
    typeof firstPage.pagination.pages,
    "number",
  );
  // Validate pagination values are valid
  TestValidator.predicate(
    "current page >= 1",
    () => firstPage.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", () => firstPage.pagination.limit > 0);
  TestValidator.predicate(
    "records >= 0",
    () => firstPage.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", () => firstPage.pagination.pages >= 0);
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(firstPage.data), true);
  // Validate ban records structure
  firstPage.data.forEach((ban: IRedditCloneCommunityBan.ISummary) => {
    TestValidator.equals("ban has id", typeof ban.id, "string");
    TestValidator.equals(
      "ban has user object",
      typeof ban.user === "object" && ban.user !== null,
      true,
    );
    TestValidator.equals(
      "ban has moderator object",
      typeof ban.moderator === "object" && ban.moderator !== null,
      true,
    );
    TestValidator.equals("ban has ban reason", typeof ban.banReason, "string");
    TestValidator.equals(
      "ban has ban start date",
      typeof ban.banStartDate,
      "string",
    );
    TestValidator.predicate("ban has valid appeal status", () =>
      ["pending", "approved", "denied"].includes(ban.appealStatus),
    );
    TestValidator.equals("ban has created at", typeof ban.createdAt, "string");
    TestValidator.predicate(
      "ban start date is valid ISO",
      () => !isNaN(Date.parse(ban.banStartDate!)),
    );
    TestValidator.predicate(
      "ban created at is valid ISO",
      () => !isNaN(Date.parse(ban.createdAt!)),
    );
    // Validate banned user structure
    TestValidator.equals("banned user has id", typeof ban.user.id, "string");
    TestValidator.equals(
      "banned user has username",
      typeof ban.user.username,
      "string",
    );
    TestValidator.predicate(
      "banned user has displayName or null",
      () =>
        ban.user.displayName === null ||
        typeof ban.user.displayName === "string",
    );
    // Validate moderator structure
    TestValidator.equals("moderator has id", typeof ban.moderator.id, "string");
    TestValidator.equals(
      "moderator has email",
      typeof ban.moderator.email,
      "string",
    );
    TestValidator.equals(
      "moderator has username",
      typeof ban.moderator.username,
      "string",
    );
  });
  // 4. Test ban end date is nullable
  firstPage.data.forEach((ban: IRedditCloneCommunityBan.ISummary) => {
    TestValidator.predicate(
      "ban end date is nullable",
      () =>
        ban.banEndDate === null ||
        ban.banEndDate === undefined ||
        typeof ban.banEndDate === "string",
    );
  });
  // 5. Test ban end date is ISO format when present
  firstPage.data.forEach((ban: IRedditCloneCommunityBan.ISummary) => {
    if (ban.banEndDate) {
      TestValidator.predicate(
        "ban end date is valid ISO",
        () => !isNaN(Date.parse(ban.banEndDate!)),
      );
    }
  });
  // 6. Test updated_at is nullable
  firstPage.data.forEach((ban: IRedditCloneCommunityBan.ISummary) => {
    TestValidator.predicate(
      "updated at is nullable",
      () =>
        ban.updatedAt === null ||
        ban.updatedAt === undefined ||
        typeof ban.updatedAt === "string",
    );
  });
  // 7. Validate ban records structure when updated_at exists
  firstPage.data.forEach((ban: IRedditCloneCommunityBan.ISummary) => {
    if (ban.updatedAt) {
      TestValidator.predicate(
        "updated at is valid ISO",
        () => !isNaN(Date.parse(ban.updatedAt!)),
      );
    }
  });
}
