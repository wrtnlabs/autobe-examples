import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_users_list_filtering_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  // 2. Test empty results with various filter scenarios
  // 2.1. Search for displayName that matches no users
  const noDisplayNameResult = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        displayName: "NON_EXISTENT_USER_XXXXX",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(noDisplayNameResult);
  TestValidator.equals(
    "displayName non-existent search returns empty",
    noDisplayNameResult.data.length,
    0,
  );
  TestValidator.equals(
    "displayName non-existent search has records=0",
    noDisplayNameResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "displayName non-existent search has pages=0",
    noDisplayNameResult.pagination.pages,
    0,
  );
  // 2.2. Search for username with non-existent pattern
  const noUsernameResult = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        username: "ZZZZZZZZZZZZZZZZZZZZZ_NONEXISTENT",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(noUsernameResult);
  TestValidator.equals(
    "username non-existent search returns empty",
    noUsernameResult.data.length,
    0,
  );
  TestValidator.equals(
    "username non-existent search has records=0",
    noUsernameResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "username non-existent search has pages=0",
    noUsernameResult.pagination.pages,
    0,
  );
  // 2.3. Filter by karmaScore range that has no users
  const highKarmaResult = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        karmaScoreMin: 10000,
        karmaScoreMax: 20000,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(highKarmaResult);
  TestValidator.equals(
    "high karma range returns empty",
    highKarmaResult.data.length,
    0,
  );
  TestValidator.equals(
    "high karma range has records=0",
    highKarmaResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "high karma range has pages=0",
    highKarmaResult.pagination.pages,
    0,
  );
  // 2.4. Test combined filters (high karma with no users, and high page request)
  const combinedRestrictiveResult =
    await api.functional.redditPlatform.users.index(memberConnection, {
      body: {
        karmaScoreMin: 10000,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    });
  typia.assert(combinedRestrictiveResult);
  TestValidator.equals(
    "combined restrictive filters return empty",
    combinedRestrictiveResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined restrictive filters has records=0",
    combinedRestrictiveResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined restrictive filters has pages=0",
    combinedRestrictiveResult.pagination.pages,
    0,
  );
  // 3. Test case-insensitive partial text matching
  // 3.1. Get a user and use their username in mixed case
  const basicResult = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: { limit: 1 } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(basicResult);
  if (basicResult.data.length > 0) {
    const testUsername = basicResult.data[0].username;
    const mixedCaseResult = await api.functional.redditPlatform.users.index(
      memberConnection,
      {
        body: {
          username: testUsername.toUpperCase(),
        } satisfies IRedditPlatformMember.IRequest,
      },
    );
    typia.assert(mixedCaseResult);
    TestValidator.equals(
      "case-insensitive username search finds user",
      mixedCaseResult.data.length,
      1,
    );
    TestValidator.equals(
      "case-insensitive username search has records=1",
      mixedCaseResult.pagination.records,
      1,
    );
  }
  // 4. Test that optional filter fields do not affect results
  // 4.1. Get baseline with no filters
  const baselineResult = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: { limit: 5 } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(baselineResult);
  const baselineCount = baselineResult.data.length;
  // 4.2. Call with all optional filters omitted (not provided)
  const noFilterResult = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {} satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(noFilterResult);
  TestValidator.equals(
    "unspecified filters return same results as no filters",
    noFilterResult.data.length,
    baselineCount,
  );
}
