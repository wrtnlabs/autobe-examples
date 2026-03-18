import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

export async function test_api_timesheets_approver_all_employees(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique identifiers for test users
  const approverEmail = typia.random<string & tags.Format<"email">>();
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  // Register approver member account
  const approverConnection: api.IConnection = { host: connection.host };
  const approverAuth = await authorize_member_join(approverConnection, {
    body: {
      email: approverEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(approverAuth);
  // Register employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Create organization for test (use first organization from approver's memberships)
  const organizationMembership =
    await generate_random_hrms_member_organization_members_create(
      approverConnection,
      { body: {} } satisfies {
        body?: DeepPartial<IHrmsOrganizationMember.ICreate> | undefined;
      },
    );
  const organizationId = organizationMembership.organization.id;
  // Get approver role ID from the created membership
  const approverRoleId = organizationMembership.organizationRole.id;
  // Assign employee role to employee (different from approver role for proper permissions)
  const employeeMembership =
    await generate_random_hrms_member_organization_members_create(
      employeeConnection,
      { body: {} } satisfies {
        body?: DeepPartial<IHrmsOrganizationMember.ICreate> | undefined;
      },
    );
  const employeeRoleId = employeeMembership.organizationRole.id;
  // Create date range for test (current week)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const startDate = startOfWeek.toISOString().split("T")[0];
  const endDate = endOfWeek.toISOString().split("T")[0];
  // As approver, call timesheets analytics endpoint
  const approverAnalyticsConnection: api.IConnection = {
    host: connection.host,
  };
  // Note: approverConnection.headers already has the token from authorize_member_join
  const analyticsResult = await api.functional.hrms.member.timesheets.analytics(
    approverAnalyticsConnection,
    {
      body: {
        organization_id: organizationId,
        start_date: startDate,
        end_date: endDate,
      } satisfies IHrmsTimesheet.IRequest,
    },
  );
  typia.assert(analyticsResult);
  // Validate response structure
  TestValidator.equals(
    "analytics has pagination",
    analyticsResult.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "analytics has limit",
    analyticsResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "analytics has records",
    analyticsResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "analytics has pages",
    analyticsResult.pagination.pages >= 0,
    true,
  );
  // Validate timesheet data structure if any exist
  if (analyticsResult.data.length > 0) {
    TestValidator.equals(
      "timesheets contain project data",
      analyticsResult.data.every((ts) => ts.project_id !== undefined),
      true,
    );
    TestValidator.equals(
      "timesheets contain project names",
      analyticsResult.data.every((ts) => ts.project_name !== undefined),
      true,
    );
    TestValidator.equals(
      "timesheets have budget_hours",
      analyticsResult.data.every((ts) => typeof ts.budget_hours === "number"),
      true,
    );
    TestValidator.equals(
      "timesheets have actual_hours",
      analyticsResult.data.every((ts) => typeof ts.actual_hours === "number"),
      true,
    );
    TestValidator.equals(
      "timesheets have utilization_percentage",
      analyticsResult.data.every(
        (ts) => typeof ts.utilization_percentage === "number",
      ),
      true,
    );
    TestValidator.equals(
      "timesheets have utilization_flag",
      analyticsResult.data.every(
        (ts) => typeof ts.utilization_flag === "boolean",
      ),
      true,
    );
  }
  // Test that analytics endpoint requires valid organization_id in request body
  await TestValidator.error(
    "analytics rejects invalid organization",
    async () => {
      await api.functional.hrms.member.timesheets.analytics(
        approverAnalyticsConnection,
        {
          body: {
            organization_id: typia.random<string & tags.Format<"uuid">>(),
            start_date: startDate,
            end_date: endDate,
          } satisfies IHrmsTimesheet.IRequest,
        },
      );
    },
  );
}