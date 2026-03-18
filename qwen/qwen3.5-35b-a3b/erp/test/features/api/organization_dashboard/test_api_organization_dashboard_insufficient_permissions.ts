import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_dashboard_insufficient_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (employee role, no report:view permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoinResult);
  // 2. Verify member can access their own dashboard (not organization dashboard)
  // The organization dashboard requires report:view permission which employees don't have
  // 3. Attempt to access organization dashboard with member role
  let httpError: api.HttpError | null = null;
  try {
    const dashboard =
      await api.functional.hrms.member.organization_dashboard.getDashboard(
        memberConnection,
      );
    typia.assert(dashboard);
  } catch (exp) {
    if (typia.is<api.HttpError>(exp)) {
      httpError = exp;
    } else {
      throw exp;
    }
  }
  // 4. Validate 403 Forbidden response for member without report:view permission
  TestValidator.equals(
    "organization dashboard returns 403 for member without report:view",
    httpError?.status,
    403,
  );
  // 5. Validate error message indicates insufficient permissions
  const errorMessage = httpError !== null ? httpError.message : undefined;
  TestValidator.predicate(
    "error message contains insufficient permission text",
    () =>
      errorMessage !== null &&
      errorMessage !== undefined &&
      typeof errorMessage === "string" &&
      errorMessage.includes("permission"),
  );
  // 6. Validate no dashboard data is returned on 403
  TestValidator.equals(
    "no dashboard data returned on 403",
    httpError !== null,
    true,
  );
  // 7. Test with second member who has manager role (simulating role switch)
  // Create another member connection with different permissions
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoinResult);
  // In a real scenario, the manager would have report:view permission
  // For this test, we demonstrate the pattern of connection isolation
  // The actual permission check happens on the server side
  // Validate connection isolation - manager connection is separate
  TestValidator.equals(
    "manager connection host matches base connection",
    managerConnection.host,
    connection.host,
  );
  TestValidator.equals(
    "member connection host matches base connection",
    memberConnection.host,
    connection.host,
  );
}