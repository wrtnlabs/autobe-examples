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

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member connection and register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(joinResult);
  // Capture original tokens and member identity
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalMemberId = joinResult.member.id;
  const originalMemberEmail = joinResult.member.email;
  // 2. Use the refresh token to obtain a new token pair
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate token rotation - new tokens must differ from original
  TestValidator.notEquals(
    "access token must be rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token must be rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // 4. Validate new tokens are non-empty
  TestValidator.predicate(
    "new access token must be non-empty",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token must be non-empty",
    refreshResult.token.refresh.length > 0,
  );
  // 5. Validate token expiry timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "token.expired_at must be in the future",
    new Date(refreshResult.token.expired_at) > now,
  );
  TestValidator.predicate(
    "token.refreshable_until must be in the future",
    new Date(refreshResult.token.refreshable_until) > now,
  );
  // 6. Validate member identity consistency
  TestValidator.equals(
    "member id must match join response",
    refreshResult.member.id,
    originalMemberId,
  );
  TestValidator.equals(
    "member email must match join response",
    refreshResult.member.email,
    originalMemberEmail,
  );
  // 7. Validate account is active (deleted_at must be null)
  TestValidator.equals(
    "member.deleted_at must be null (account active)",
    refreshResult.member.deleted_at,
    null,
  );
}
