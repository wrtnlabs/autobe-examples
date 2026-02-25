import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_banned_users_list_pagination_basic(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of a paginated list of banned users as a moderator with filters and pagination
  // 1. Moderator join and obtain authenticated connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `mod_${RandomGenerator.alphaNumeric(6)}@test.com`,
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    },
  });
  typia.assert(joinOutput);
  moderatorConnection.headers = { Authorization: joinOutput.token.access };
  // Expect unauthorized error for unauthenticated connection
  await TestValidator.httpError(
    "unauthorized access should be denied",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.index(
        { host: connection.host },
        { body: {} },
      );
    },
  );
  // 2. Prepare test data: create multiple banned user entries if necessary
  // Note: Since no utility for ban/unban creation, we'll rely on the moderator being able to fetch existing bans or no bans
  // Using basic pagination parameters page=1, limit=5
  const requestBody: ICommunityPlatformBannedUser.IRequest = {
    page: 1,
    limit: 5,
    isBanned: true, // active bans
  };
  // 3. Request paginated banned users list
  const result =
    await api.functional.communityPlatform.moderator.banned_users.index(
      moderatorConnection,
      { body: requestBody },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is at most 5",
    result.pagination.limit <= 5,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 5. Validate banned user summaries array
  TestValidator.predicate(
    "banned users data is array",
    Array.isArray(result.data),
  );
  for (const item of result.data) {
    // Validate banned user summary schema
    typia.assert(item);
    // Validate timestamps format and presence
    TestValidator.predicate(
      `bannedAt is valid ISO date-time: ${item.bannedAt}`,
      Boolean(Date.parse(item.bannedAt)),
    );
    if (item.unbannedAt !== undefined && item.unbannedAt !== null) {
      TestValidator.predicate(
        `unbannedAt is valid ISO date-time or null: ${item.unbannedAt}`,
        item.unbannedAt === null || Boolean(Date.parse(item.unbannedAt)),
      );
    }
    // Validate presence of reason
    TestValidator.predicate(
      "reason exists and is string",
      typeof item.reason === "string" && item.reason.length > 0,
    );
    // Validate user summary
    typia.assert(item.user);
    TestValidator.predicate(
      "user.id is a uuid",
      /^[0-9a-f-]{36}$/.test(item.user.id),
    );
    TestValidator.predicate(
      "user.email is string",
      typeof item.user.email === "string",
    );
    TestValidator.predicate(
      "user.username is string",
      typeof item.user.username === "string",
    );
    TestValidator.predicate(
      "user.displayName is string",
      typeof item.user.displayName === "string",
    );
    TestValidator.predicate(
      "user.bio is string or null or undefined",
      item.user.bio === null ||
        item.user.bio === undefined ||
        typeof item.user.bio === "string",
    );
    TestValidator.predicate(
      "user.avatarUrl is string or null or undefined",
      item.user.avatarUrl === null ||
        item.user.avatarUrl === undefined ||
        typeof item.user.avatarUrl === "string",
    );
    TestValidator.predicate(
      "user.karma is number",
      typeof item.user.karma === "number",
    );
    TestValidator.predicate(
      "user.createdAt is ISO date-time string",
      Boolean(Date.parse(item.user.createdAt)),
    );
    TestValidator.predicate(
      "user.updatedAt is ISO date-time string",
      Boolean(Date.parse(item.user.updatedAt)),
    );
    TestValidator.predicate(
      "user.deletedAt is null or ISO date-time string",
      item.user.deletedAt === null || Boolean(Date.parse(item.user.deletedAt!)),
    );
    // Validate community summary
    typia.assert(item.community);
    TestValidator.predicate(
      "community.id is a uuid",
      /^[0-9a-f-]{36}$/.test(item.community.id),
    );
    TestValidator.predicate(
      "community.name is string",
      typeof item.community.name === "string",
    );
    TestValidator.predicate(
      "community.description is string",
      typeof item.community.description === "string",
    );
    TestValidator.predicate(
      "community.iconUrl is string",
      typeof item.community.iconUrl === "string",
    );
    TestValidator.predicate(
      "community.subscriberCount is number",
      typeof item.community.subscriberCount === "number",
    );
    TestValidator.predicate(
      "community.ownerUser is non-null object",
      typeof item.community.ownerUser === "object" &&
        item.community.ownerUser !== null,
    );
    // ownerUser validations
    const owner = item.community.ownerUser;
    TestValidator.predicate(
      "ownerUser.id is uuid",
      /^[0-9a-f-]{36}$/.test(owner.id),
    );
    TestValidator.predicate(
      "ownerUser.email is string",
      typeof owner.email === "string",
    );
    TestValidator.predicate(
      "ownerUser.username is string",
      typeof owner.username === "string",
    );
    TestValidator.predicate(
      "ownerUser.displayName is string",
      typeof owner.displayName === "string",
    );
    TestValidator.predicate(
      "ownerUser.bio is string or null or undefined",
      owner.bio === null ||
        owner.bio === undefined ||
        typeof owner.bio === "string",
    );
    TestValidator.predicate(
      "ownerUser.avatarUrl is string or null or undefined",
      owner.avatarUrl === null ||
        owner.avatarUrl === undefined ||
        typeof owner.avatarUrl === "string",
    );
    TestValidator.predicate(
      "ownerUser.karma is number",
      typeof owner.karma === "number",
    );
    TestValidator.predicate(
      "ownerUser.createdAt is ISO date-time string",
      Boolean(Date.parse(owner.createdAt)),
    );
    TestValidator.predicate(
      "ownerUser.updatedAt is ISO date-time string",
      Boolean(Date.parse(owner.updatedAt)),
    );
    TestValidator.predicate(
      "ownerUser.deletedAt is null or ISO date-time string",
      owner.deletedAt === null || Boolean(Date.parse(owner.deletedAt!)),
    );
  }
}
