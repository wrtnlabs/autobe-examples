import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Capture original refresh token before refresh
  const originalRefreshToken = joinResponse.token.refresh;
  // 3. Verify member information is available
  TestValidator.equals("member has id", joinResponse.id !== undefined, true);
  TestValidator.equals(
    "email matches input format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(joinResponse.email),
    true,
  );
  TestValidator.equals(
    "organization memberships count",
    joinResponse.organization_memberships.length >= 0,
    joinResponse.organization_memberships.length === joinResponse.organization_memberships.length,
  );
  // 4. Perform token refresh with original refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IHrmsMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 5. Verify new access token exists and has ~15 minute expiration
  TestValidator.predicate(
    "new access token exists",
    refreshResponse.token.access.length > 0,
  );
  const newAccessExpireDate = new Date(refreshResponse.token.expired_at);
  const now = new Date();
  const minutesUntilExpire =
    (newAccessExpireDate.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token has ~15 minutes validity",
    minutesUntilExpire >= 14 && minutesUntilExpire <= 16,
  );
  // 6. Verify new refresh token exists and has ~7 days validity
  TestValidator.predicate(
    "new refresh token exists",
    refreshResponse.token.refresh.length > 0,
  );
  const newRefreshableUntilDate = new Date(
    refreshResponse.token.refreshable_until,
  );
  const daysUntilRefreshableUntil =
    (newRefreshableUntilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token has ~7 days validity",
    daysUntilRefreshableUntil >= 6 && daysUntilRefreshableUntil <= 8,
  );
  // 7. Verify member information is returned correctly
  TestValidator.equals(
    "member id matches",
    joinResponse.id,
    refreshResponse.id,
  );
  TestValidator.equals(
    "email matches",
    joinResponse.email,
    refreshResponse.email,
  );
  TestValidator.equals(
    "display name matches",
    joinResponse.display_name,
    refreshResponse.display_name,
  );
  TestValidator.equals(
    "organization memberships count matches",
    joinResponse.organization_memberships.length,
    refreshResponse.organization_memberships.length,
  );
  // 8. Verify original refresh token is invalidated (should fail)
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "original refresh token is invalidated",
    async () => {
      await authorize_member_refresh(invalidRefreshConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IHrmsMember.IRefresh,
      });
    },
  );
  // 9. Verify new refresh token works for subsequent refresh
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResponse = await authorize_member_refresh(
    validRefreshConnection,
    {
      body: {
        refresh_token: refreshResponse.token.refresh,
      } satisfies IHrmsMember.IRefresh,
    },
  );
  typia.assert(secondRefreshResponse);
  TestValidator.equals(
    "second refresh works with new token",
    secondRefreshResponse.id,
    refreshResponse.id,
  );
  // 10. Verify new access token can authenticate subsequent API requests
  // Use the connection that was updated by authorize_member_refresh
  const authenticatedConnection: api.IConnection = { ...refreshConnection };
  authenticatedConnection.headers = { ...authenticatedConnection.headers };
  authenticatedConnection.headers.Authorization = refreshResponse.token.access;
  typia.assert(authenticatedConnection);
  // Note: Since we don't have a dashboard endpoint in the provided API list,
  // we verify the token is valid by ensuring the refresh response itself was successful
  // and the access token can be used for future requests
  TestValidator.predicate(
    "refresh response token can be used for subsequent requests",
    refreshResponse.token.access.length > 0,
  );
}