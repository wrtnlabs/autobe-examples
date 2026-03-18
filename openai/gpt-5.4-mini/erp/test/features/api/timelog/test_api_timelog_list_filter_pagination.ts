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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_timelog_list_filter_pagination(
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
  const organization =
    await api.functional.hrmTimeTracking.member.organizations.create(
      memberConnection,
      {
        body: {
          name: `timelog-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const request = {
    page: 1,
    limit: 20,
    sort: "work_date_desc",
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const response: IPageIHrmTimeTrackingTimelog.ISummary =
    await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      { body: request },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
  for (const item of response.data) typia.assert(item);
  const sortedByWorkDate = [...response.data].sort((a, b) => {
    const diff = b.work_date.localeCompare(a.work_date);
    return diff !== 0 ? diff : b.id.localeCompare(a.id);
  });
  TestValidator.equals(
    "work date descending order",
    response.data,
    sortedByWorkDate,
  );
  const byCreatedAt: IPageIHrmTimeTrackingTimelog.ISummary =
    await api.functional.hrmTimeTracking.member.timelogs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at_desc",
        } satisfies IHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(byCreatedAt);
  const sortedByCreatedAt = [...byCreatedAt.data].sort((a, b) => {
    const diff = b.created_at.localeCompare(a.created_at);
    return diff !== 0 ? diff : b.id.localeCompare(a.id);
  });
  TestValidator.equals(
    "created_at descending order",
    byCreatedAt.data,
    sortedByCreatedAt,
  );
  TestValidator.predicate(
    "organization context is established",
    organization.id.length > 0,
  );
}
