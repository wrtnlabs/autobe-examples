import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_listing_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. For this test, we use a valid UUID format for organizationId
  // In a complete E2E flow, this would come from organization creation or login
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call department listing endpoint with pagination parameters
  const result: IPageIHrmDepartment.ISummary =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 10,
          sort_by: "name",
          sort_order: "asc",
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination.current is valid",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is valid",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is valid",
    result.pagination.pages >= 0,
  );
  // 5. Validate that pages calculation is consistent
  TestValidator.predicate(
    "pages calculation is consistent",
    result.pagination.limit === 0
      ? result.pagination.pages === 0
      : result.pagination.pages ===
          Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 6. Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // 7. Validate each department in the data array
  for (const department of result.data) {
    typia.assert(department);
    // Validate required fields
    TestValidator.predicate("department has id", department.id.length > 0);
    TestValidator.predicate("department has name", department.name.length > 0);
    TestValidator.predicate(
      "department has created_at",
      department.created_at.length > 0,
    );
    // Validate parent_department structure
    if (department.parent_department !== null) {
      typia.assert(department.parent_department);
      TestValidator.predicate(
        "parent_department has id",
        department.parent_department.id.length > 0,
      );
      TestValidator.predicate(
        "parent_department has name",
        department.parent_department.name.length > 0,
      );
      TestValidator.predicate(
        "parent_department has created_at",
        department.parent_department.created_at.length > 0,
      );
    }
  }
  // 8. Validate consistency between records count and data array length
  TestValidator.predicate(
    "data array length matches pagination limit or total records",
    result.data.length <= result.pagination.limit &&
      result.data.length <= result.pagination.records,
  );
}
