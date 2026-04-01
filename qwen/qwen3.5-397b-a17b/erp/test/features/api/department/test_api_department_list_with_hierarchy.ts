import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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

export async function test_api_department_list_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve department list with hierarchy
  const departmentList =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(departmentList);
  // 3. Validate pagination metadata (business logic validation)
  TestValidator.predicate(
    "pagination current is valid",
    departmentList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    departmentList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination limit is within max",
    departmentList.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    departmentList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    departmentList.pagination.pages >= 0,
  );
  // 4. Validate department data structure exists
  TestValidator.predicate(
    "departments array exists",
    Array.isArray(departmentList.data),
  );
  // 5. Validate hierarchical sorting (top-level first, then children alphabetically)
  const topLevelDepts = departmentList.data.filter((d) => d.parent === null);
  const childDepts = departmentList.data.filter((d) => d.parent !== null);
  // Verify top-level departments appear before child departments
  if (topLevelDepts.length > 0 && childDepts.length > 0) {
    const firstTopLevelIndex = departmentList.data.findIndex(
      (d) => d.parent === null,
    );
    const firstChildIndex = departmentList.data.findIndex(
      (d) => d.parent !== null,
    );
    TestValidator.predicate(
      "top-level departments appear first",
      firstTopLevelIndex < firstChildIndex,
    );
  }
  // Verify child departments are sorted alphabetically by name
  if (childDepts.length > 1) {
    for (let i = 0; i < childDepts.length - 1; i++) {
      TestValidator.predicate(
        `child departments sorted alphabetically (${i} vs ${i + 1})`,
        childDepts[i].name.localeCompare(childDepts[i + 1].name) <= 0,
      );
    }
  }
}
