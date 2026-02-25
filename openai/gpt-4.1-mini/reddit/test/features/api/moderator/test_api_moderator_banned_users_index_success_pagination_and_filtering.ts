import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_banned_users_index_success_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies paginated retrieval and filtering of banned users list by moderator in community
  // Step 1: Moderator joins and obtains authorization token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput: Partial<ICommunityPlatformModerator.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: `https://avatars.example.com/${RandomGenerator.alphabets(10)}`,
  };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: moderatorJoinInput,
    },
  );
  typia.assert(authorizedModerator);
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorizedModerator.token.access}`,
  };
  // Use a mock communityId as we need valid UUID format, simulate with random
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Prepare various filter requests for pagination and filtering
  // 1) Basic request with page and limit
  const basicRequest: ICommunityPlatformCommunityBannedUser.IRequest = {
    page: 1,
    limit: 10,
  };
  const page1 =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId, body: basicRequest },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination current page is 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    page1.pagination.limit === 10,
  );
  // 2) Request filtering by ban status = 'banned'
  const bannedStatusRequest: ICommunityPlatformCommunityBannedUser.IRequest = {
    banStatus: "banned",
    page: 1,
    limit: 5,
  };
  const bannedPage =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId, body: bannedStatusRequest },
    );
  typia.assert(bannedPage);
  TestValidator.predicate(
    "each banned user unbannedAt is null",
    bannedPage.data.every((item) => item.unbannedAt === null),
  );
  // 3) Request filtering by ban status = 'unbanned'
  const unbannedStatusRequest: ICommunityPlatformCommunityBannedUser.IRequest =
    {
      banStatus: "unbanned",
      page: 1,
      limit: 5,
    };
  const unbannedPage =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId, body: unbannedStatusRequest },
    );
  typia.assert(unbannedPage);
  TestValidator.predicate(
    "each unbanned user unbannedAt is not null",
    unbannedPage.data.every((item) => item.unbannedAt !== null),
  );
  // 4) Request filtering by bannedAt date range
  const fromDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days ago
  const bannedDateRangeRequest: ICommunityPlatformCommunityBannedUser.IRequest =
    {
      bannedAt: fromDate,
      page: 1,
      limit: 5,
    };
  const bannedDatePage =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId, body: bannedDateRangeRequest },
    );
  typia.assert(bannedDatePage);
  // Validate bannedAt date string format and values are >= fromDate
  for (const item of bannedDatePage.data) {
    TestValidator.predicate(
      "bannedAt format valid",
      typeof item.bannedAt === "string",
    );
    TestValidator.predicate(
      "bannedAt after fromDate",
      item.bannedAt >= fromDate,
    );
  }
  // 5) Request filtering by unbannedAt date range
  const unbannedDateRangeRequest: ICommunityPlatformCommunityBannedUser.IRequest =
    {
      unbannedAt: fromDate,
      banStatus: "unbanned",
      page: 1,
      limit: 5,
    };
  const unbannedDatePage =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId, body: unbannedDateRangeRequest },
    );
  typia.assert(unbannedDatePage);
  for (const item of unbannedDatePage.data) {
    TestValidator.predicate(
      "unbannedAt format valid",
      item.unbannedAt !== null && typeof item.unbannedAt === "string",
    );
    TestValidator.predicate(
      "unbannedAt after fromDate",
      (item.unbannedAt ?? "") >= fromDate,
    );
  }
  // 6) Request filtering by search term matching user details or ban reason
  // For search term, we pick a substring from an actual data if available
  const searchTerm =
    bannedDatePage.data.length > 0
      ? RandomGenerator.substring(bannedDatePage.data[0].banReason || "")
      : "reason";
  const searchRequest: ICommunityPlatformCommunityBannedUser.IRequest = {
    search: searchTerm,
    page: 1,
    limit: 5,
  };
  const searchedPage =
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      moderatorConnection,
      { communityId, body: searchRequest },
    );
  typia.assert(searchedPage);
  // Validate some of the returned results contain the search term in banReason or user data
  TestValidator.predicate(
    "search results includes either banReason or user fields",
    searchedPage.data.every(
      (item) =>
        item.banReason.includes(searchTerm) ||
        item.user.email.includes(searchTerm) ||
        item.user.username.includes(searchTerm) ||
        item.user.displayName.includes(searchTerm),
    ),
  );
  // 7) Authorization enforcement: unauthorized user should get access denied
  // Create a base connection without authorization headers
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access denied", 401, async () => {
    await api.functional.communityPlatform.moderator.communities.banned_users.index(
      unauthConnection,
      { communityId, body: basicRequest },
    );
  });
}
