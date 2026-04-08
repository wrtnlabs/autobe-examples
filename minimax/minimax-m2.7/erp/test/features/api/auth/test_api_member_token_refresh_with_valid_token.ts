import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Store original token info for comparison
  const originalAccessToken = authorized.token.access;
  const originalRefreshToken = authorized.token.refresh;
  const memberId = authorized.id;
  const memberEmail = authorized.email;
  const memberDisplayName = authorized.display_name;
  // 2. Call refresh endpoint with the valid refresh token using utility function
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Validate new tokens are returned
  TestValidator.equals(
    "access token exists",
    refreshed.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    refreshed.token.refresh.length > 0,
    true,
  );
  // 4. Validate tokens are different (new tokens issued)
  TestValidator.notEquals(
    "new access token",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // 5. Validate token expiration timestamps are valid ISO date-time
  const accessExpiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "access token has future expiration",
    accessExpiredAt > new Date(),
  );
  TestValidator.predicate(
    "refresh token has future expiration",
    refreshableUntil > new Date(),
  );
  // 6. Validate member info matches
  TestValidator.equals("member id matches", refreshed.id, memberId);
  TestValidator.equals("member email matches", refreshed.email, memberEmail);
  TestValidator.equals(
    "member display_name matches",
    refreshed.display_name,
    memberDisplayName,
  );
}
