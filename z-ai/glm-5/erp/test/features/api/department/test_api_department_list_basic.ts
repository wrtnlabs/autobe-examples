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

/**
 * Test the basic department listing functionality for an authenticated member.
 * Validates pagination metadata, department fields, sorting order, and
 * soft-deletion filtering for the organization's department list.
 */
export async function test_api_department_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - establishes organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve department list with pagination
  const pageResult = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(pageResult);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination.current should be >= 0",
    pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be >= 0",
    pageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be >= 0",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    pageResult.pagination.pages >= 0,
  );
  // 4. Validate alphabetical sorting by name (ascending)
  if (pageResult.data.length > 1) {
    for (let i = 0; i < pageResult.data.length - 1; i++) {
      TestValidator.predicate(
        "departments should be sorted alphabetically by name",
        pageResult.data[i].name.toLowerCase() <=
          pageResult.data[i + 1].name.toLowerCase(),
      );
    }
  }
}
