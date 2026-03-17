import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member account to obtain initial refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Extract initial refresh token from join response
  const initialRefreshToken = member.token.refresh;
  // 3. Refresh token to obtain new access and refresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedMember = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IMultiUserTodoAppMember.IRefresh,
  });
  typia.assert(refreshedMember);
  // 4. Validate member profile is returned correctly
  TestValidator.equals("member id matches", refreshedMember.id, member.id);
  TestValidator.equals(
    "display name matches",
    refreshedMember.displayName,
    member.displayName,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.createdAt),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(member.updatedAt),
  );
  // 5. Validate new access token expiration (should be 1 hour from now)
  const accessExpiredAt = new Date(refreshedMember.token.expired_at).getTime();
  const now = new Date().getTime();
  const expectedAccessExpiry = now + 60 * 60 * 1000; // 1 hour
  const accessExpiryDifference = Math.abs(
    accessExpiredAt - expectedAccessExpiry,
  );
  TestValidator.predicate(
    "access token expires approximately 1 hour from now",
    accessExpiryDifference < 5 * 60 * 1000,
  );
  // 6. Validate new refresh token expiration (should be 7 days from now)
  const refreshableUntil = new Date(
    refreshedMember.token.refreshable_until,
  ).getTime();
  const expectedRefreshExpiry = now + 7 * 24 * 60 * 60 * 1000; // 7 days
  const refreshExpiryDifference = Math.abs(
    refreshableUntil - expectedRefreshExpiry,
  );
  TestValidator.predicate(
    "refresh token expires approximately 7 days from now",
    refreshExpiryDifference < 30 * 60 * 60 * 1000,
  );
  // 7. Test that new tokens are different from old tokens
  TestValidator.notEquals(
    "new access token differs from old",
    member.token.access,
    refreshedMember.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    initialRefreshToken,
    refreshedMember.token.refresh,
  );
}