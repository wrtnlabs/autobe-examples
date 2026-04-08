import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_grade_visibility_across_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first administrator account
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Authorized: IEcommerceAdmin.IAuthorized =
    await authorize_admin_join(admin1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    });
  typia.assert(admin1Authorized);
  // 2. Create second administrator account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Authorized: IEcommerceAdmin.IAuthorized =
    await authorize_admin_join(admin2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    });
  typia.assert(admin2Authorized);
  // 3. Query first admin's grade assignment using admin2's credentials
  const grade: IEcommerceAdministratorGrade =
    await api.functional.ecommerce.admin.grades.at(admin2Connection, {
      adminId: admin1Authorized.id,
    });
  typia.assert(grade);
  // 4. Validate grade response structure
  TestValidator.equals(
    "grade admin id matches queried admin",
    grade.ecommerceAdmin.id,
    admin1Authorized.id,
  );
  TestValidator.equals(
    "grade admin email matches queried admin",
    grade.ecommerceAdmin.email,
    admin1Authorized.email,
  );
  TestValidator.predicate(
    "grade value is valid",
    grade.grade === "regular" || grade.grade === "super",
  );
  TestValidator.predicate(
    "grade has valid created_at timestamp",
    grade.created_at !== null && grade.created_at !== undefined,
  );
  TestValidator.predicate(
    "grade has valid updated_at timestamp",
    grade.updated_at !== null && grade.updated_at !== undefined,
  );
}