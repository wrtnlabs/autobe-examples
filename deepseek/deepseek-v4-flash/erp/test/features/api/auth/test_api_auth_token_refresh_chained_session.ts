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

export async function test_api_auth_token_refresh_chained_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial authentication tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {});
  typia.assert(joinResult);
  // 2. First refresh using the initial refresh token
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_member_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh: joinResult.token.refresh,
      } satisfies IHrmTimeTrackingMember.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // 3. Second refresh using the refresh token from the first refresh (rotated)
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh: firstRefreshResult.token.refresh,
      } satisfies IHrmTimeTrackingMember.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  // 4. Verify member identity (id) is consistent across all three responses
  TestValidator.equals(
    "member id after first refresh",
    joinResult.id,
    firstRefreshResult.id,
  );
  TestValidator.equals(
    "member id after second refresh",
    joinResult.id,
    secondRefreshResult.id,
  );
  // 5. Verify member identity (email) is consistent across all three responses
  TestValidator.equals(
    "member email after first refresh",
    joinResult.email,
    firstRefreshResult.email,
  );
  TestValidator.equals(
    "member email after second refresh",
    joinResult.email,
    secondRefreshResult.email,
  );
  // 6. Verify member identity (display_name) is consistent across all three responses
  TestValidator.equals(
    "member display_name after first refresh",
    joinResult.display_name,
    firstRefreshResult.display_name,
  );
  TestValidator.equals(
    "member display_name after second refresh",
    joinResult.display_name,
    secondRefreshResult.display_name,
  );
  // 7. Verify access tokens are rotated (different after each refresh)
  TestValidator.notEquals(
    "access token rotated after first refresh",
    joinResult.token.access,
    firstRefreshResult.token.access,
  );
  TestValidator.notEquals(
    "access token rotated after second refresh",
    firstRefreshResult.token.access,
    secondRefreshResult.token.access,
  );
  // 8. Verify refresh tokens are rotated (different after each refresh)
  TestValidator.notEquals(
    "refresh token rotated after first refresh",
    joinResult.token.refresh,
    firstRefreshResult.token.refresh,
  );
  TestValidator.notEquals(
    "refresh token rotated after second refresh",
    firstRefreshResult.token.refresh,
    secondRefreshResult.token.refresh,
  );
  // 9. Verify that each access token works by checking it was set on its connection
  TestValidator.predicate(
    "first refresh connection has Authorization header",
    () => firstRefreshConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "second refresh connection has Authorization header",
    () => secondRefreshConnection.headers?.Authorization !== undefined,
  );
}
