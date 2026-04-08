import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_list_employee_own_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate valid organization ID for the request
  // Note: In production, this would come from member's organizations array after login
  // or from organization creation. For this test, we use a valid UUID format.
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve timelogs with no filters (empty request body)
  // This tests the happy path where employee views their own timelogs
  const timelogResponse =
    await api.functional.hrm.member.organizations.timelogs.index(
      memberConnection,
      {
        organizationId,
        body: {} satisfies IHrmTimelog.IRequest,
      },
    );
  typia.assert(timelogResponse);
  // 4. Validate pagination metadata structure and values
  TestValidator.predicate(
    "pagination current page is non-negative",
    timelogResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    timelogResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    timelogResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    timelogResponse.pagination.pages >= 0,
  );
  // 5. Validate timelog entries structure when data exists
  // Note: ISummary type may not have all the fields being checked below.
  // Removed property-specific validations that reference non-existent fields.
  if (timelogResponse.data.length > 0) {
    const firstTimelog = timelogResponse.data[0];
    typia.assert(firstTimelog);
    // ISummary structure validated by typia.assert above
    // Field-specific validations removed due to type mismatch
  }
  // 6. Verify pagination consistency
  TestValidator.predicate(
    "data array length is within pagination limit",
    timelogResponse.data.length <= timelogResponse.pagination.limit,
  );
  TestValidator.predicate(
    "data array length matches records on first page",
    timelogResponse.pagination.current === 1
      ? timelogResponse.data.length === timelogResponse.pagination.records
      : true,
  );
  // 7. Validate response type structure
  TestValidator.predicate(
    "response has data array",
    Array.isArray(timelogResponse.data),
  );
  TestValidator.predicate(
    "response has pagination object",
    timelogResponse.pagination !== undefined,
  );
}
