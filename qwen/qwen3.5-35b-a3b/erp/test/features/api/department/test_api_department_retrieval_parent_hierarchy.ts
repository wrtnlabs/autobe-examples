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

export async function test_api_department_retrieval_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinOutput);
  // Extract organization from member session
  // Note: organization should come from session or be stored elsewhere
  // For this test, we'll use a UUID from the member's first session if available
  let organizationId: string;
  if (joinOutput.sessions && joinOutput.sessions.length > 0) {
    const session = joinOutput.sessions[0];
    organizationId =
      session.organization?.id ?? "00000000-0000-0000-0000-000000000001";
  } else {
    organizationId = "00000000-0000-0000-0000-000000000001"; // Fallback UUID
  }
  typia.assert(organizationId, (props) => {
    props.message = `Invalid organization ID: ${organizationId}`;
    throw new Error(props.message);
  });
  // 2. Create parent department
  const parentConnection: api.IConnection = { host: connection.host };
  parentConnection.headers = { Authorization: joinOutput.token.access };
  const parentDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      parentConnection,
      {
        organizationId,
        body: {
          name: "Engineering",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 3. Create child department under parent
  const childDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      parentConnection,
      {
        organizationId,
        body: {
          name: "Frontend Development",
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 4. Retrieve parent department with child relationships
  const retrievedParent =
    await api.functional.hrmPlatform.member.organizations.departments.at(
      parentConnection,
      {
        organizationId,
        departmentId: parentDepartment.id,
      },
    );
  typia.assert(retrievedParent);
  // 5. Validate parent department entity structure
  TestValidator.equals(
    "parent department name matches",
    retrievedParent.name,
    "Engineering",
  );
  TestValidator.equals(
    "parent department id matches",
    retrievedParent.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent department is null (top-level)",
    retrievedParent.parentDepartment,
    null,
  );
  TestValidator.equals(
    "child departments array has one item",
    retrievedParent.childDepartments.length,
    1,
  );
  if (retrievedParent.childDepartments.length > 0) {
    const child = retrievedParent.childDepartments[0];
    TestValidator.equals(
      "child department id in array",
      child.id,
      childDepartment.id,
    );
    TestValidator.equals(
      "child department name in array",
      child.name,
      "Frontend Development",
    );
  }
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(retrievedParent.created_at).toISOString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    new Date(retrievedParent.updated_at).toISOString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "timestamps follow chronological order",
    new Date(retrievedParent.created_at) <=
      new Date(retrievedParent.updated_at),
  );
}
