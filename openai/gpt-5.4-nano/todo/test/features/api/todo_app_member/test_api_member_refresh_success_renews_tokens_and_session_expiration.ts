import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_success_renews_tokens_and_session_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member and obtain initial authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const oldToken: IAuthorizationToken = joined.token;
  const oldExpiredMs = Date.parse(oldToken.expired_at);
  const oldMemberId = joined.id;
  const oldEmail = joined.email;
  const oldStatus = joined.status;
  const oldCreatedAt = joined.created_at;
  const oldUpdatedAt = joined.updated_at;
  const oldDeletedAt = joined.deleted_at;
  const oldProfileDisplayName = joined.profile.display_name;
  // 2) Refresh using refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: oldToken.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshed);
  const newToken: IAuthorizationToken = refreshed.token;
  // 3) Validate token renewal/rotation
  TestValidator.notEquals(
    "access token should be renewed",
    newToken.access,
    oldToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    newToken.refresh,
    oldToken.refresh,
  );
  // 4) Validate expiration metadata updated
  const nowMs = Date.now();
  const newExpiredMs = Date.parse(newToken.expired_at);
  const oldRefreshableMs = Date.parse(oldToken.refreshable_until);
  const newRefreshableMs = Date.parse(newToken.refreshable_until);
  TestValidator.predicate(
    "refreshed expired_at should be in the future",
    newExpiredMs > nowMs,
  );
  TestValidator.predicate(
    "refreshed expired_at should be later than previous expired_at",
    newExpiredMs > oldExpiredMs,
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be >= refreshed expired_at",
    newRefreshableMs >= newExpiredMs,
  );
  TestValidator.predicate(
    "refreshable_until should not decrease compared to previous",
    newRefreshableMs >= oldRefreshableMs,
  );
  // 5) Validate member identity consistency
  TestValidator.equals("member id matches", refreshed.id, oldMemberId);
  TestValidator.equals("member email matches", refreshed.email, oldEmail);
  TestValidator.equals("member status matches", refreshed.status, oldStatus);
  TestValidator.equals(
    "member created_at matches",
    refreshed.created_at,
    oldCreatedAt,
  );
  TestValidator.equals(
    "member updated_at matches",
    refreshed.updated_at,
    oldUpdatedAt,
  );
  TestValidator.equals(
    "member deleted_at matches",
    refreshed.deleted_at,
    oldDeletedAt,
  );
  TestValidator.equals(
    "profile.display_name matches",
    refreshed.profile.display_name,
    oldProfileDisplayName,
  );
}
