import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLogType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_types_filter_by_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Filter by category "employee"
  const employeePage =
    await api.functional.hrmTimeTracking.member.activityLogTypes.index(
      memberConnection,
      {
        body: {
          category: "employee",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHrmTimeTrackingActivityLogType.IRequest,
      },
    );
  typia.assert(employeePage);
  TestValidator.predicate(
    "employee activity log types all have category 'employee'",
    () =>
      employeePage.data.length > 0 &&
      employeePage.data.every((item) => item.category === "employee"),
  );
  // 3. Filter by category "project"
  const projectPage =
    await api.functional.hrmTimeTracking.member.activityLogTypes.index(
      memberConnection,
      {
        body: {
          category: "project",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHrmTimeTrackingActivityLogType.IRequest,
      },
    );
  typia.assert(projectPage);
  TestValidator.predicate(
    "project activity log types all have category 'project'",
    () =>
      projectPage.data.length > 0 &&
      projectPage.data.every((item) => item.category === "project"),
  );
  // 4. Filter by invalid/nonexistent category
  const emptyPage =
    await api.functional.hrmTimeTracking.member.activityLogTypes.index(
      memberConnection,
      {
        body: {
          category: "nonexistent",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHrmTimeTrackingActivityLogType.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "nonexistent category returns empty data",
    () => emptyPage.data.length === 0,
  );
}
