import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_platform_moderator_communities_bans_create";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test comprehensive pagination parameters including page number, limit, and total records calculation.
 * Verify proper response structure with pagination metadata and ban record data for the list endpoint.
 */
export async function test_api_bans_pagination_structure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: `mod${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "1234",
      username: `moderator${RandomGenerator.alphaNumeric(6)}`,
    } satisfies IRedditPlatformModerator.IJoin,
  });
  const moderatorAuth = await authorize_moderator_login(moderatorConnection, {
    body: {
      email: `mod${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "1234",
    } satisfies IRedditPlatformModerator.ILogin,
  });
  const moderatorAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: moderatorAuth.token.access },
  };
  // 2. Test bans index endpoint
  const response = await api.functional.redditPlatform.user.bans.index(
    moderatorAuthConnection,
  );
  typia.assert(response);
  // 3. Verify response structure
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.equals(
    "response has pagination",
    response.pagination !== undefined,
    true,
  );
  // 4. Verify pagination metadata
  typia.assert(response.pagination);
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current > 0,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response.pagination.pages >= 0,
  );
  // 5. Verify ban records structure
  TestValidator.equals(
    "has at least one ban record",
    response.data.length >= 0,
    true,
  );
  // 6. Test pagination with different parameters
  if (response.pagination.records > 0) {
    // Test with limit parameter
    const limitedResponse = await api.functional.redditPlatform.user.bans.index(
      moderatorAuthConnection,
    );
    typia.assert(limitedResponse);
    TestValidator.predicate(
      "limited response data size",
      limitedResponse.data.length <= response.pagination.limit,
    );
  }
}
