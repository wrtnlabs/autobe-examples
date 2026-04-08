import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Call PATCH /erpHrm/member/departments with empty request body
  const response = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Verify response structure has pagination and data
  TestValidator.predicate(
    "has pagination metadata",
    response.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(response.data));
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Verify results are sorted alphabetically by name
  for (let i = 1; i < response.data.length; i++) {
    const prev = response.data[i - 1].name;
    const curr = response.data[i].name;
    TestValidator.predicate(
      `departments sorted alphabetically at index ${i}`,
      prev.localeCompare(curr) <= 0,
    );
  }
  // 5. Verify each department has required fields
  for (const dept of response.data) {
    TestValidator.predicate("has id", dept.id !== undefined);
    TestValidator.predicate("has name", dept.name !== undefined);
    TestValidator.predicate("has description field", "description" in dept);
    TestValidator.predicate("has created_at", dept.created_at !== undefined);
    TestValidator.predicate("has updated_at", dept.updated_at !== undefined);
    TestValidator.predicate("has parent field", "parent" in dept);
  }
}
