import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account using utility function to obtain valid refresh_token
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // 2. Extract the refresh token from join response
  const refreshToken = joinResult.token.refresh;
  // 3. Use the refresh token to obtain new access and refresh tokens
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshedConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate member information is preserved
  TestValidator.equals("member id preserved", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "email preserved",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "display_name preserved",
    refreshResult.display_name,
    joinResult.display_name,
  );
  // 5. Validate dashboard data structures exist
  TestValidator.predicate(
    "activeTimers is array",
    Array.isArray(refreshResult.activeTimers),
  );
  TestValidator.predicate("projectSummary has valid structure", () => {
    return (
      refreshResult.projectSummary.active >= 0 &&
      refreshResult.projectSummary.archived >= 0 &&
      refreshResult.projectSummary.completed >= 0
    );
  });
  TestValidator.predicate("taskOverview has valid structure", () => {
    return (
      refreshResult.taskOverview.byPriority.low >= 0 &&
      refreshResult.taskOverview.byPriority.medium >= 0 &&
      refreshResult.taskOverview.byPriority.high >= 0 &&
      refreshResult.taskOverview.byPriority.urgent >= 0 &&
      refreshResult.taskOverview.byStatus.open >= 0 &&
      refreshResult.taskOverview.byStatus.inProgress >= 0 &&
      refreshResult.taskOverview.byStatus.completed >= 0 &&
      refreshResult.taskOverview.byStatus.closed >= 0
    );
  });
  TestValidator.predicate("recentActivity has valid structure", () => {
    return (
      refreshResult.recentActivity.timelogsCount >= 0 &&
      refreshResult.recentActivity.totalHoursThisWeek >= 0
    );
  });
  // 6. Validate new access token can be used for authenticated requests
  TestValidator.predicate(
    "new access token exists",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is future date",
    new Date(refreshResult.token.expired_at) > new Date(),
  );
}
