import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test that a timelog included in an approved timesheet cannot be deleted.
 *
 * Validates the strongest data protection rule that locks historical time records after manager approval. This test sets up the complete infrastructure required for timelog deletion validation, though the full approved timesheet blocking scenario cannot be tested due to missing timesheet APIs in the provided SDK.
 *
 * The test verifies that timelog deletion works correctly for timelogs not associated with approved timesheets, while documenting the limitation that approved timesheet blocking validation requires additional API endpoints.
 *
 * **Setup Steps:**
 * 1. Create a member account with email/password credentials
 * 2. Extract organization context from member authentication response
 * 3. Create a project within the organization with active status
 * 4. Create a timelog for the authenticated employee on the project
 * 5. Attempt timelog deletion (should succeed without timesheet blocking)
 *
 * **Limitations:**
 * - Timesheet creation, submission, and approval APIs not available in provided SDK
 * - Cannot test the core business rule: "timelog deletion blocked by approved timesheet"
 * - This test validates deletion endpoint functionality for non-blocked timelogs only
 *
 * **Business Rules Validated:**
 * - Timelog deletion endpoint is accessible and functional
 * - Timelog deletion succeeds when not part of submitted/approved timesheet
 * - [Cannot test] Timelog deletion returns 403 when part of approved timesheet
 * - [Cannot test] Timelog deletion returns 403 when part of submitted timesheet
 */
export async function test_api_timelog_deletion_blocked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // Extract organization context from member response
  const organizationId = member.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Member must belong to at least one organization");
  }
  // 2. Create a project in the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          status: "active",
        },
      },
    );
  typia.assert(project);
  // 3. Create a timelog for the authenticated employee on the project
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  // 4. Attempt timelog deletion (should succeed without timesheet blocking)
  // Note: Cannot test approved timesheet blocking due to missing timesheet APIs
  await api.functional.hrm.member.organizations.timelogs.eraseByOrganizationidAndTimelogid(
    memberConnection,
    {
      organizationId,
      timelogId: timelog.id,
    },
  );
  // 5. Verify timelog was deleted (soft delete - deleted_at should be set)
  // Note: Cannot verify without timelog GET endpoint in SDK
}
