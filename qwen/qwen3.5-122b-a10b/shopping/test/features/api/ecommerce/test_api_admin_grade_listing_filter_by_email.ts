import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_grade_listing_filter_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple administrators with different email addresses
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin1);
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin2);
  const adminConnection3: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(adminConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin3);
  // 2. Create a super admin to perform the grade listing
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 3. Filter grade assignments by email substring - test partial match
  const searchSubstring = typia
    .random<string & tags.Format<"email">>()
    .split("@")[0]
    .substring(0, 4);
  const filteredResults = await api.functional.ecommerce.admin.grades.index(
    superAdminConnection,
    {
      body: {
        adminEmail: searchSubstring,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(filteredResults);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    filteredResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    filteredResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    filteredResults.pagination.records >= 0,
  );
  // 5. Validate all returned grades match the email filter
  await TestValidator.predicate("all results match email filter", async () => {
    for (const grade of filteredResults.data) {
      if (
        !grade.admin.email.toLowerCase().includes(searchSubstring.toLowerCase())
      ) {
        return false;
      }
    }
    return true;
  });
  // 6. Test empty result with non-matching substring
  const nonMatchingSubstring = "xyz123abc";
  const emptyResults = await api.functional.ecommerce.admin.grades.index(
    superAdminConnection,
    {
      body: {
        adminEmail: nonMatchingSubstring,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty result count",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.predicate("empty data array", emptyResults.data.length === 0);
}
