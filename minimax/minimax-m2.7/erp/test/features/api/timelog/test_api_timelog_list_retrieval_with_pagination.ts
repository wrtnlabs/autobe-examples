import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to obtain JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call PATCH /erpHrm/member/timelogs with default pagination
  const response = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  // 3. Validate response structure with typia.assert
  typia.assert(response);
  // 4. Validate pagination object structure
  const { pagination, data } = response;
  TestValidator.equals("pagination current is 1", pagination.current, 1);
  TestValidator.equals("pagination limit is 20", pagination.limit, 20);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // 5. Validate data array type
  TestValidator.predicate("data is array", Array.isArray(data));
  // 6. If there are summary records, validate structure
  if (data.length > 0) {
    const firstSummary = data[0];
    // Validate required fields on ISummary (analytics type)
    TestValidator.predicate("summary has groupBy", "groupBy" in firstSummary);
    TestValidator.predicate(
      "groupBy is valid",
      firstSummary.groupBy === "employee" ||
        firstSummary.groupBy === "project" ||
        firstSummary.groupBy === "task",
    );
    TestValidator.predicate(
      "summary has totalMinutes",
      "totalMinutes" in firstSummary,
    );
    TestValidator.predicate(
      "summary has billableMinutes",
      "billableMinutes" in firstSummary,
    );
    TestValidator.predicate(
      "summary has nonBillableMinutes",
      "nonBillableMinutes" in firstSummary,
    );
    TestValidator.predicate(
      "summary has timelogCount",
      "timelogCount" in firstSummary,
    );
    // Validate associated entities based on groupBy
    if (firstSummary.groupBy === "project" && firstSummary.project) {
      TestValidator.predicate("project has id", "id" in firstSummary.project);
      TestValidator.predicate(
        "project has name",
        "name" in firstSummary.project,
      );
    }
    if (firstSummary.groupBy === "task" && firstSummary.task) {
      TestValidator.predicate("task has id", "id" in firstSummary.task);
      TestValidator.predicate("task has title", "title" in firstSummary.task);
    }
    if (firstSummary.groupBy === "employee" && firstSummary.employee) {
      TestValidator.predicate("employee has id", "id" in firstSummary.employee);
      TestValidator.predicate(
        "employee has email",
        "email" in firstSummary.employee,
      );
    }
  }
  // 7. Verify pagination metadata consistency
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation correct",
      pagination.pages === Math.ceil(pagination.records / pagination.limit),
    );
  } else {
    TestValidator.equals("pages is 0 when no records", pagination.pages, 0);
  }
}
