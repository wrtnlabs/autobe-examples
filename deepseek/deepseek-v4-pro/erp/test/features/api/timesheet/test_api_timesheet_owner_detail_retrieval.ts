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
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that an employee can retrieve their own draft timesheet's full detail.
 *
 * Validates that the timesheet detail endpoint returns complete information
 * including week boundaries, draft status, null review timestamps, the owning
 * employee's summary profile, and the timelogs array. Also confirms that the
 * employee can access their own timesheet without requiring the time:view_all
 * permission — ownership alone grants access.
 *
 * 1. Register and authenticate a new member via authorize_member_join.
 * 2. Create a draft timesheet using the generation utility for a specific week.
 * 3. Retrieve the timesheet detail using the at endpoint with the timesheet ID.
 * 4. Validate the response structure: status is draft, submitted_at and
 *    reviewed_at are null, reviewedByUser and rejection_reason are null,
 *    deleted_at is null, and timelogs is an array.
 */
export async function test_api_timesheet_owner_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Authenticate as the employee who will own the timesheet
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Retrieve the timesheet detail by its ID
  const detail = await api.functional.erpHrm.member.timesheets.at(
    memberConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(detail);
  // 4. Validate business-logic properties of the retrieved timesheet
  TestValidator.equals("timesheet id matches", detail.id, timesheet.id);
  TestValidator.equals("status is draft", detail.status, "draft");
  TestValidator.equals("submitted_at is null", detail.submitted_at, null);
  TestValidator.equals("reviewed_at is null", detail.reviewed_at, null);
  TestValidator.equals("reviewedByUser is null", detail.reviewedByUser, null);
  TestValidator.equals(
    "rejection_reason is null",
    detail.rejection_reason,
    null,
  );
  TestValidator.equals("deleted_at is null", detail.deleted_at, null);
  TestValidator.predicate(
    "timelogs is an array",
    Array.isArray(detail.timelogs),
  );
}
