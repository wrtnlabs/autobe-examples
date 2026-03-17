import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account and capture initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  const originalMemberId = joinResult.id;
  const originalEmail = joinResult.email;
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  // Step 2: Use the refresh token to obtain a new token pair
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Validate identity fields are preserved
  TestValidator.equals("member id matches", refreshResult.id, originalMemberId);
  TestValidator.equals("email matches", refreshResult.email, originalEmail);
  TestValidator.equals(
    "profile memberId matches",
    refreshResult.profile.memberId,
    originalMemberId,
  );
  TestValidator.equals("deleted_at is null", refreshResult.deleted_at, null);
  // Step 4: Validate token expiry is in the future
  TestValidator.predicate(
    "token expired_at is in the future",
    new Date(refreshResult.token.expired_at).getTime() > Date.now(),
  );
  // Step 5: Validate token rotation - new tokens must differ from original tokens
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
}
