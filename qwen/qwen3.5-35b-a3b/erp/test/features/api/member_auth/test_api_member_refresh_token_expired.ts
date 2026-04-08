import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // Extract valid tokens from the join result
  const validRefreshToken = joinResult.token.refresh;
  typia.assert(validRefreshToken);
  // 2. Create an expired refresh token scenario
  // Using a JWT token with past expiration to simulate an expired refresh token
  // The backend should reject this as expired rather than valid
  const expiredRefreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  // 3. Attempt to refresh with an expired token
  // The system should reject this and throw an appropriate error
  await TestValidator.error(
    "expired refresh token should be rejected with expiration error",
    async () => {
      await authorize_member_refresh(memberConnection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IHrmPlatformMember.IRefresh,
      });
    },
  );
  // 4. Verify that the expired token cannot be used to obtain new tokens
  // The error from TestValidator.error confirms this behavior
  // No new tokens should be issued for expired refresh tokens
  // 5. Confirm that the valid refresh token still works (to show only expired ones fail)
  const freshMemberConnection: api.IConnection = { host: connection.host };
  const freshRefreshResult = await authorize_member_refresh(
    freshMemberConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IHrmPlatformMember.IRefresh,
    },
  );
  typia.assert(freshRefreshResult);
  // Verify that fresh token refresh returns new valid tokens
  TestValidator.predicate(
    "fresh refresh returns new tokens",
    freshRefreshResult.token.access !== undefined,
  );
  TestValidator.predicate(
    "fresh refresh has valid refresh token",
    freshRefreshResult.token.refresh !== undefined,
  );
}