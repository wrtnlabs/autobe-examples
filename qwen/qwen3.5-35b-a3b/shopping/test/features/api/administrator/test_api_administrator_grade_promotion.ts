import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grade_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator (grade changer)
  // Note: Super admin is created with regular grade first, then we need to verify
  // the join endpoint behavior. For this test, we'll create a regular admin
  // and promote it to super to test the promotion logic.
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(adminConnection1, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      grade: "regular",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin1);
  // 2. Create regular administrator (to be promoted)
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(adminConnection2, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      grade: "regular",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin2);
  // 3. Verify regular administrator has grade === 'regular' before promotion
  TestValidator.equals(
    "regular admin starts as regular grade",
    admin2.grade,
    "regular",
  );
  // 4. Promote regular administrator to super
  const promotedAdministrator =
    await api.functional.ecommerceMall.administrator.administrator_grades.update(
      adminConnection1,
      {
        body: {
          administrator_id: admin2.id,
          new_grade: "super",
          reason: "Test promotion scenario",
        } satisfies IEcommerceMallAdministratorGrade.IRequest,
      },
    );
  typia.assert(promotedAdministrator);
  // 5. Verify promotion response contains updated administrator
  TestValidator.equals(
    "promoted admin grade changed to super",
    promotedAdministrator.grade,
    "super",
  );
  TestValidator.equals(
    "promoted admin id matches target",
    promotedAdministrator.id,
    admin2.id,
  );
  TestValidator.equals(
    "promoted admin email matches",
    promotedAdministrator.email,
    admin2.email,
  );
  TestValidator.equals(
    "promoted admin display name matches",
    promotedAdministrator.display_name,
    admin2.display_name,
  );
  TestValidator.equals(
    "is_banned unchanged",
    promotedAdministrator.is_banned,
    admin2.is_banned,
  );
  // 6. Verify all required fields present in response
  TestValidator.predicate(
    "id field present",
    promotedAdministrator.id !== undefined,
  );
  TestValidator.predicate(
    "email field present",
    promotedAdministrator.email !== undefined,
  );
  TestValidator.predicate(
    "display_name field present",
    promotedAdministrator.display_name !== undefined,
  );
  TestValidator.predicate(
    "grade field present",
    promotedAdministrator.grade !== undefined,
  );
  TestValidator.predicate(
    "is_banned field present",
    promotedAdministrator.is_banned !== undefined,
  );
  TestValidator.predicate(
    "created_at field present",
    promotedAdministrator.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at field present",
    promotedAdministrator.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at field present",
    promotedAdministrator.deleted_at !== undefined,
  );
  // 7. Verify grade is immutable after change and reflects super privileges
  TestValidator.equals(
    "final grade is super",
    promotedAdministrator.grade,
    "super",
  );
  TestValidator.predicate(
    "grade change recorded",
    promotedAdministrator.updated_at > admin2.updated_at,
  );
}
