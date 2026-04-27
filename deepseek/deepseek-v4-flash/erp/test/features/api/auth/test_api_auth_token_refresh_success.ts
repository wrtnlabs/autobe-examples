import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_auth_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  // Store original token and member identity for comparison
  const originalAccessToken: string = joined.token.access;
  const originalRefreshToken: string = joined.token.refresh;
  const originalMemberId: string = joined.id;
  const originalEmail: string = joined.email;
  const originalDisplayName: string = joined.display_name;
  // 2. Create a fresh connection and call refresh with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IHrmTimeTrackingMember.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Verify new tokens are issued (different from original)
  TestValidator.notEquals(
    "new access token differs from original",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // 4. Verify member identity fields match the originally joined member
  TestValidator.equals("member id matches", refreshed.id, originalMemberId);
  TestValidator.equals("member email matches", refreshed.email, originalEmail);
  TestValidator.equals(
    "member display_name matches",
    refreshed.display_name,
    originalDisplayName,
  );
  // 5. Verify token timestamps are in the future
  const now: Date = new Date();
  const expiredAt: Date = new Date(refreshed.token.expired_at);
  TestValidator.predicate(
    "expired_at is in the future",
    () => expiredAt.getTime() > now.getTime(),
  );
  const refreshableUntil: Date = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until extends beyond current time",
    () => refreshableUntil.getTime() > now.getTime(),
  );
  // 6. Verify the new access token is set on the connection for subsequent API calls
  TestValidator.predicate(
    "new access token is set on connection",
    () => refreshConnection.headers?.Authorization === refreshed.token.access,
  );
}
