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

export async function test_api_member_refresh_token_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // Store original tokens for rotation validation
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  // 2. Prepare refresh request with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    },
  });
  typia.assert(refreshResponse);
  // 3. Validate new tokens are returned
  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newExpiredAt = refreshResponse.token.expired_at;
  const newRefreshableUntil = refreshResponse.token.refreshable_until;
  // 4. Verify token rotation - new tokens differ from original
  TestValidator.notEquals(
    "access token rotation",
    originalAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotation",
    originalRefreshToken,
    newRefreshToken,
  );
  // 5. Verify access token has appropriate short lifetime (~15 minutes)
  const expiredAtMs = new Date(newExpiredAt).getTime();
  const nowMs = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;
  const thirtyMinutes = 30 * 60 * 1000;
  TestValidator.predicate(
    "access token expired_at is within 15-30 minutes",
    expiredAtMs >= nowMs + fifteenMinutes &&
      expiredAtMs <= nowMs + thirtyMinutes,
  );
  // 6. Verify refresh token has appropriate long lifetime (~7 days)
  const refreshableUntilMs = new Date(newRefreshableUntil).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token refreshable_until is within 7-14 days",
    refreshableUntilMs >= nowMs + sevenDays &&
      refreshableUntilMs <= nowMs + fourteenDays,
  );
  // 7. Verify member information is returned correctly
  TestValidator.equals(
    "member id matches",
    refreshResponse.member.id,
    joinResponse.member.id,
  );
  TestValidator.equals(
    "member email matches",
    refreshResponse.member.email,
    joinResponse.member.email,
  );
  TestValidator.equals(
    "member display name matches",
    refreshResponse.member.display_name,
    joinResponse.member.display_name,
  );
  // 8. Verify access token is set in connection headers
  TestValidator.equals(
    "authorization header set with new access token",
    refreshConnection.headers?.authorization,
    `Bearer ${newAccessToken}`,
  );
}