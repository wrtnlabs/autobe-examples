import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_grade_change_detail_authorized_read(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_administrator_join(superAdministratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const administratorIdRaw =
    superAdministratorConnection.headers?.["x-shoppingmall-administrator-id"];
  const gradeChangeIdRaw =
    superAdministratorConnection.headers?.[
      "x-shoppingmall-administrator-grade-change-id"
    ];
  const administratorId: string | undefined =
    typeof administratorIdRaw === "string"
      ? administratorIdRaw
      : Array.isArray(administratorIdRaw) &&
          typeof administratorIdRaw[0] === "string"
        ? administratorIdRaw[0]
        : undefined;
  const gradeChangeId: string | undefined =
    typeof gradeChangeIdRaw === "string"
      ? gradeChangeIdRaw
      : Array.isArray(gradeChangeIdRaw) &&
          typeof gradeChangeIdRaw[0] === "string"
        ? gradeChangeIdRaw[0]
        : undefined;
  if (administratorId === undefined || gradeChangeId === undefined) {
    throw new Error(
      "Prepared governance fixture headers x-shoppingmall-administrator-id and x-shoppingmall-administrator-grade-change-id are required.",
    );
  }
  const detail =
    await api.functional.shoppingMall.superAdministrator.administrators.grade_changes.at(
      superAdministratorConnection,
      {
        administratorId: typia.assert<string & tags.Format<"uuid">>(
          administratorId,
        ),
        gradeChangeId: typia.assert<string & tags.Format<"uuid">>(
          gradeChangeId,
        ),
      },
    );
  typia.assert<IShoppingMallAdministratorGradeChange>(detail);
  const validGrades = ["administrator", "superAdministrator"] as const;
  TestValidator.equals(
    "grade change id matches request",
    detail.id,
    gradeChangeId,
  );
  TestValidator.equals(
    "administrator matches parent route",
    detail.administrator.id,
    administratorId,
  );
  TestValidator.notEquals(
    "grade transition changes effective hierarchy",
    detail.previous_grade,
    detail.new_grade,
  );
  TestValidator.predicate(
    "previous grade is valid hierarchy value",
    validGrades.includes(detail.previous_grade as (typeof validGrades)[number]),
  );
  TestValidator.predicate(
    "new grade is valid hierarchy value",
    validGrades.includes(detail.new_grade as (typeof validGrades)[number]),
  );
  TestValidator.predicate(
    "reason is nullable string",
    detail.reason === null || typeof detail.reason === "string",
  );
}
