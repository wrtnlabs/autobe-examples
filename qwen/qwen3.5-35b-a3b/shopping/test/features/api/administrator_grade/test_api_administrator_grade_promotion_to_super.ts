import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_mall_super_administrator_administrator_grades_create } from "../../../generate/generate_random_ecommerce_mall_super_administrator_administrator_grades_create";
import { prepare_random_ecommerce_mall_administrator_grade } from "../../../prepare/prepare_random_ecommerce_mall_administrator_grade";

export async function test_api_administrator_grade_promotion_to_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator (target)
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_administrator_join(
    targetAdminConnection,
    {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular" as const,
      } satisfies IEcommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(targetAdmin);
  // 2. Create super administrator (grader)
  const graderConnection: api.IConnection = { host: connection.host };
  const grader = await authorize_super_administrator_join(graderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  typia.assert(grader);
  // 3. Super administrator promotes regular administrator
  const gradeChangeConnection: api.IConnection = { host: connection.host };
  const gradeChange =
    await generate_random_ecommerce_mall_super_administrator_administrator_grades_create(
      gradeChangeConnection,
      {
        body: {
          administrator_id: targetAdmin.id,
          grade: "super" as const,
          reason: "Promotion for excellent platform oversight performance",
        } satisfies IEcommerceMallAdministratorGrade.ICreate,
      },
    );
  typia.assert(gradeChange);
  // 4. Validate grade change record
  TestValidator.equals("grade changed to super", gradeChange.grade, "super");
  TestValidator.equals(
    "previous grade was regular",
    gradeChange.previous_grade,
    "regular",
  );
  TestValidator.equals(
    "changed_by references grader",
    gradeChange.changed_by,
    grader.id,
  );
  TestValidator.equals(
    "administrator_id references target",
    gradeChange.administrator_id,
    targetAdmin.id,
  );
  // 5. Verify nested administrator object has updated grade
  typia.assert(gradeChange.administrator);
  TestValidator.equals(
    "nested administrator has updated grade",
    gradeChange.administrator.grade,
    "super",
  );
  // 6. Verify changedBy object contains grader's account information
  typia.assert(gradeChange.changedBy);
  TestValidator.equals(
    "changedBy has correct id",
    gradeChange.changedBy.id,
    grader.id,
  );
}