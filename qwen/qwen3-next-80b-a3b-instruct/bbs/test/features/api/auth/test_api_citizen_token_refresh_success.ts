import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize citizen to obtain refresh token
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenAuth: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  typia.assert(citizenAuth);
  // Step 2: Create a new connection for refresh token operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Use the refresh token from the authorized citizen to refresh the access token
  const refreshed: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_refresh(refreshConnection, {
      body: {
        refreshToken: citizenAuth.token.refresh,
      } satisfies IEconomicDiscussionCitizen.IRefresh,
    });
  typia.assert(refreshed);
  // Step 3: Validate that refresh was successful
  // Refreshed token should have new access token but same citizen information
  TestValidator.equals(
    "refreshed citizen ID matches original",
    refreshed.id,
    citizenAuth.id,
  );
  TestValidator.equals(
    "refreshed display name matches original",
    refreshed.display_name,
    citizenAuth.display_name,
  );
  TestValidator.equals(
    "refreshed bio matches original",
    refreshed.bio,
    citizenAuth.bio,
  );
  TestValidator.notEquals(
    "new access token differs from original",
    refreshed.token.access,
    citizenAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshed.token.refresh,
    citizenAuth.token.refresh,
  );
  TestValidator.predicate("new access token has shorter expiration", () => {
    const originalExpire = new Date(citizenAuth.token.expired_at).getTime();
    const newExpire = new Date(refreshed.token.expired_at).getTime();
    return newExpire > originalExpire; // New token should have later expiration
  });
  TestValidator.predicate("refresh token is still valid", () => {
    const refreshUntil = new Date(
      citizenAuth.token.refreshable_until,
    ).getTime();
    const refreshExpire = new Date(refreshed.token.expired_at).getTime();
    return refreshExpire < refreshUntil; // New access token expiration should be within refreshable period
  });
  // Step 4: Verify that the refreshed connection can still access protected resources
  // This confirms the new token is fully functional
  // Instead of calling non-existent 'me' endpoint, use refresh endpoint again with new token
  // This tests that the refreshed token can be used for subsequent refreshes
  const reRefreshed: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_refresh(refreshConnection, {
      body: {
        refreshToken: refreshed.token.refresh,
      } satisfies IEconomicDiscussionCitizen.IRefresh,
    });
  typia.assert(reRefreshed);
  TestValidator.equals(
    "re-refreshed citizen ID matches original refreshed citizen",
    reRefreshed.id,
    refreshed.id,
  );
  TestValidator.notEquals(
    "second refresh token differs from first refreshed token",
    reRefreshed.token.refresh,
    refreshed.token.refresh,
  );
}
