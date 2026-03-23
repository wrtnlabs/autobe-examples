import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";

export async function test_api_department_hierarchy_level_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Create top-level department (no parent) - should succeed
  const topDepartment =
    await api.functional.hrmTracker.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        } satisfies IHrmTrackerDepartment.ICreate,
      },
    );
  typia.assert(topDepartment);
  TestValidator.equals(
    "top department has no parent",
    topDepartment.parent,
    null,
  );
  // 3. Create child department with top-level as parent - should succeed
  const childDepartment =
    await api.functional.hrmTracker.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: topDepartment.id,
        } satisfies IHrmTrackerDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  TestValidator.equals(
    "child department has correct parent",
    childDepartment.parent?.id,
    topDepartment.id,
  );
  TestValidator.equals(
    "child has zero children count",
    childDepartment.children_count,
    0,
  );
  // 4. Attempt to create grandchild department (two levels deep) - should fail
  await TestValidator.error(
    "grandchild creation should be rejected",
    async () => {
      await api.functional.hrmTracker.member.departments.create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: null,
            parent_id: childDepartment.id,
          } satisfies IHrmTrackerDepartment.ICreate,
        },
      );
    },
  );
  // 5. Verify top-level department now has one child by listing or refetching
  // Since we can't directly refetch, use the member connection to create a new department with same parent
  // as a workaround to validate hierarchy constraints
  const anotherChild =
    await api.functional.hrmTracker.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: null,
          parent_id: topDepartment.id,
        } satisfies IHrmTrackerDepartment.ICreate,
      },
    );
  typia.assert(anotherChild);
  TestValidator.equals(
    "another child has correct parent",
    anotherChild.parent?.id,
    topDepartment.id,
  );
}
