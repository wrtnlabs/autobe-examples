import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_create_child_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? undefined,
    } satisfies IHrmPlatformMember.IJoin,
  });
  // Step 2: Create parent department "Engineering" without parent reference
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: { name: "Engineering" } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // Step 3: Create child department "Backend Team" with parent reference
  const childDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Backend Team",
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // Step 4-7: Validate department hierarchy
  TestValidator.equals(
    "Child department name matches",
    childDepartment.name,
    "Backend Team",
  );
  TestValidator.notEquals(
    "Child department ID differs from parent",
    childDepartment.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "Child department is not soft-deleted",
    childDepartment.deleted_at,
    null,
  );
  TestValidator.equals(
    "Child and parent share same organization context",
    childDepartment.organization.id,
    parentDepartment.organization.id,
  );
  // Validate parent summary in child response
  TestValidator.predicate(
    "Child has non-null parent department summary",
    childDepartment.parentDepartment !== null,
  );
  const parentSummary: IHrmPlatformDepartment.ISummary =
    childDepartment.parentDepartment!;
  typia.assert(parentSummary);
  TestValidator.equals(
    "Parent summary name matches",
    parentSummary.name,
    "Engineering",
  );
  TestValidator.equals(
    "Parent summary has null parent (one-level enforced)",
    parentSummary.parentDepartment,
    null,
  );
}
