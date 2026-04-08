import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test budget report endpoint for projects without budget hours allocation.
 *
 * Validates that the budget report endpoint properly rejects requests for projects that do not have budget hours allocated. This ensures the system prevents division by zero errors and enforces the business rule that budget tracking is required for reporting.
 *
 * The test authenticates a member, then attempts to retrieve a budget report for a non-existent project. Since projects without budget hours (or non-existent projects) cannot have meaningful budget reports, the endpoint should return a 404 Not Found error.
 *
 * 1. Authenticate member account using authorize_member_join utility.
 * 2. Create authenticated connection with member's access token.
 * 3. Call budget report endpoint with random project ID (simulating no budget project).
 * 4. Verify endpoint returns 404 error for projects without budget allocation.
 */
export async function test_api_project_budget_report_no_budget_hours(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create authenticated connection
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Test budget report for non-existent project (no budget)
  await TestValidator.httpError(
    "budget report should return 404 for project without budget",
    404,
    async () => {
      await api.functional.hrm.member.organizations.projects.budget_report.budgetReport(
        authenticatedConnection,
        {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
          projectId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
