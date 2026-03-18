import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_organization_view_listing(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const defaultPage =
    await api.functional.hrmTimeTracking.member.timelogs.organization_view.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page has non-negative total records",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default page has valid page count",
    defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default page has valid current page",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default page has valid limit",
    defaultPage.pagination.limit >= 1,
  );
  const emptyPage =
    await api.functional.hrmTimeTracking.member.timelogs.organization_view.index(
      memberConnection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(32),
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page has no records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page has no pages",
    emptyPage.pagination.pages,
    0,
  );
  TestValidator.equals("empty page has no data", emptyPage.data.length, 0);
}
