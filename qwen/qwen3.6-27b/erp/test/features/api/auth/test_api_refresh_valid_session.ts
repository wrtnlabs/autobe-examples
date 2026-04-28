import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_refresh_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and join to get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    display_name: RandomGenerator.name(),
    href: "http://localhost",
    referrer: "http://localhost",
  } satisfies IHrmPlatformMember.IJoin;
  const initialAuth = await api.functional.hrmPlatform.auth.member.join(
    memberConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(initialAuth);
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. Create refresh-specific connection and submit refresh token to renew session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies IHrmPlatformMember.IRefresh;
  const refreshedAuth = await api.functional.hrmPlatform.auth.member.refresh(
    refreshConnection,
    {
      body: refreshBody,
    },
  );
  typia.assert(refreshedAuth);
  // 3. Validate new tokens are different from original tokens
  TestValidator.notEquals(
    "new access token differs from initial",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from initial",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 4. Validate member identity is maintained
  TestValidator.equals(
    "member email matches",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "member display_name matches",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals("member id matches", refreshedAuth.id, initialAuth.id);
  // 5. Validate expired_at and refreshable_until are present in response
  TestValidator.predicate(
    "expired_at is present",
    refreshedAuth.token.expired_at != null &&
      refreshedAuth.token.expired_at > "",
  );
  TestValidator.predicate(
    "refreshable_until is present",
    refreshedAuth.token.refreshable_until != null &&
      refreshedAuth.token.refreshable_until > "",
  );
}