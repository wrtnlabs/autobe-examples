import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test creating a top-level department without a parent reference.
 *
 * Validates the complete department creation flow including member registration,
 * organization setup, and creation of a root-level department. Ensures that the
 * department correctly has null parent reference, is properly scoped to the
 * organization, and includes all required fields in the response.
 *
 * Special attention is given to verifying that the parent_department_id field
 * is correctly persisted as null, and that the soft delete tracking is properly
 * initialized with deleted_at set to null for an active department.
 *
 * 1. Register a new member account with organization creation via POST /hrmPlatform/auth/member/join.
 * 2. Extract the organization ID from the member session.
 * 3. Create a top-level department with parent_department_id explicitly set to null.
 * 4. Validate all response fields including id, name, organization reference, and timestamps.
 * 5. Verify that parentDepartment is null, indicating no parent relationship.
 * 6. Confirm that deleted_at is null (active status) and childDepartments is empty.
 */
export async function test_api_department_create_without_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        avatar_uri: typia.random<string & tags.Format<"uri">>(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        org_logo_uri: typia.random<string & tags.Format<"uri">>(),
        org_timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        org_fiscal_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(joined);
  // 2. Create authenticated connection using token from join
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: `Bearer ${joined.token.access}` };
  // 3. Extract organization ID from member session
  const organizationId: string & tags.Format<"uuid"> = typia.assert(
    joined.sessions![0]!.organization!.id!,
  );
  // 4. Create top-level department with null parent
  const inputName: string = RandomGenerator.name();
  const department: IHrmPlatformDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: inputName,
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 5. Validate response fields
  TestValidator.equals("department id exists", department.id, department.id);
  TestValidator.predicate(
    "department name is present",
    department.name.length > 0,
  );
  TestValidator.equals(
    "department name matches input",
    department.name,
    inputName,
  );
  TestValidator.equals(
    "organization reference matches",
    department.organization.id,
    organizationId,
  );
  TestValidator.predicate(
    "created_at is present",
    department.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    department.updated_at.length > 0,
  );
  // 6. Validate parent relationship
  TestValidator.equals(
    "parentDepartment is null",
    department.parentDepartment,
    null,
  );
  // 7. Validate soft delete tracking
  TestValidator.equals(
    "deleted_at is null (active)",
    department.deleted_at,
    null,
  );
  // 8. Validate child departments (should be empty for top-level)
  TestValidator.equals(
    "childDepartments array empty",
    department.childDepartments.length,
    0,
  );
}
