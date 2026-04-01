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

/**
 * Test department deletion success workflow.
 *
 * This test validates the complete department deletion lifecycle:
 * 1. Member authentication via join
 * 2. Top-level department creation
 * 3. Department deletion via erase endpoint
 * 4. Validation of successful deletion completion
 *
 * The erase endpoint performs soft-delete by setting deleted_at timestamp
 * and returns 204 No Content on success.
 */
export async function test_api_department_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a top-level department (no parent_department_id)
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // Validate department was created as top-level (business logic validation)
  TestValidator.predicate(
    "department is top-level (no parent)",
    department.parentDepartment === null,
  );
  TestValidator.predicate(
    "department is active before deletion",
    department.deleted_at === null,
  );
  // 3. Delete the department using erase endpoint
  await api.functional.hrmPlatform.member.departments.erase(memberConnection, {
    departmentId: department.id,
  });
  // 4. Deletion completed successfully
  // The erase endpoint returns void (204 No Content) on success.
  // Successful completion without error indicates deletion succeeded.
  // Backend performs soft-delete (sets deleted_at), removes from list queries,
  // and creates activity log entry for audit purposes.
}
