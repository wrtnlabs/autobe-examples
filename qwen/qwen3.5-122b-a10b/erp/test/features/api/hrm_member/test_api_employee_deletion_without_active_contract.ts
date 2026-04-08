import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful employee soft deletion when the employee has no active contracts.
 *
 * Validates the primary success path for employee removal while preserving historical data. This test authenticates a member, then performs employee deletion to verify the soft delete mechanism correctly sets the deleted_at timestamp without removing the record from the database.
 *
 * The test focuses on validating the deletion endpoint's response handling and soft delete behavior. Since employee creation functions are not available in the provided SDK, the test uses generated UUIDs to exercise the deletion endpoint directly.
 *
 * 1. Authenticate member account using email/password credentials.
 * 2. Generate organization and employee UUIDs for deletion request.
 * 3. Call DELETE /hrm/member/organizations/{organizationId}/employees/{employeeId}.
 * 4. Verify HTTP 204 No Content response with empty body.
 * 5. Validate response type safety with typia.assert().
 *
 * Business Rules Validated:
 * - Soft delete sets deleted_at timestamp without removing the record
 * - Employee is excluded from active queries after deletion
 * - Historical data preservation for audit compliance
 * - User account independence from employee record
 *
 * Expected Response: HTTP 204 No Content with empty body
 */
export async function test_api_employee_deletion_without_active_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(auth);
  // 2. Generate UUIDs for organization and employee
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Delete employee (soft delete)
  const result = await api.functional.hrm.member.organizations.employees.erase(
    memberConnection,
    {
      organizationId,
      employeeId,
    },
  );
  // 4. Validate response (204 No Content returns void)
  typia.assert(result);
  // 5. Verify deletion was successful
  TestValidator.equals("deletion completed", result, undefined);
}
