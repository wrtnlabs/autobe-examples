import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
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

export async function test_api_department_hierarchy_filter(
  connection: api.IConnection,
) {
  // 1. Authenticate member to obtain session token
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const authorized = await api.functional.hrmPlatform.auth.member.join(
    memberConnection,
    { body: memberJoinBody },
  );
  typia.assert(authorized);
  // 2. Create parent (root) department 1 - no parent_department_id
  const parentDept1 =
    await api.functional.hrmPlatform.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDept1);
  // 3. Create parent (root) department 2 - no parent_department_id
  const parentDept2 =
    await api.functional.hrmPlatform.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDept2);
  // 4. Create child department referencing parentDept1
  const childOfParent1 =
    await api.functional.hrmPlatform.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: parentDept1.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childOfParent1);
  // 5. Create child department referencing parentDept2
  const childOfParent2 =
    await api.functional.hrmPlatform.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: parentDept2.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childOfParent2);
  // 6. Filter root-level (parent_department_id=null)
  const rootFilterResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(rootFilterResult);
  TestValidator.equals(
    "root level department count",
    rootFilterResult.pagination.records,
    2,
  );
  TestValidator.predicate(
    "all root departments have null parentDepartment",
    rootFilterResult.data.every((d) => d.parentDepartment === null),
  );
  // 7. Filter direct children of parentDept1 (parent_department_id=<parent_uuid>)
  const parent1ChildrenResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: parentDept1.id,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(parent1ChildrenResult);
  TestValidator.equals(
    "direct children count of parentDept1",
    parent1ChildrenResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "all returned children match parentDept1",
    parent1ChildrenResult.data.every(
      (d) => d.parentDepartment?.id === parentDept1.id,
    ),
  );
  // 8. Filter with non-existent parent_department_id
  const fakeUUID = typia.random<string & tags.Format<"uuid">>();
  const emptyFilterResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: fakeUUID,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "non-existent parent returns zero records",
    emptyFilterResult.pagination.records,
    0,
  );
  // 9. Validate one-level nesting constraint enforced (prevents grandparents)
  await TestValidator.httpError(
    "grandchild creation returns 400 one-level nesting constraint",
    400,
    async () => {
      await api.functional.hrmPlatform.member.departments.create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            parent_department_id: childOfParent1.id,
          } satisfies IHrmPlatformDepartment.ICreate,
        },
      );
    },
  );
  // 10. Validate LEFT JOIN correctly populates parentDepartment
  const parent2ChildrenResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: parentDept2.id,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(parent2ChildrenResult);
  TestValidator.equals(
    "parent2 children count",
    parent2ChildrenResult.pagination.records,
    1,
  );
  typia.assertGuard(parent2ChildrenResult.data[0].parentDepartment!);
  TestValidator.equals(
    "child has correct parentDepartment id",
    parent2ChildrenResult.data[0].parentDepartment.id,
    parentDept2.id,
  );
}
