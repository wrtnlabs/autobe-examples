import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_grade_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve an existing administrator grade by UUID
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const administrator = await authorize_administrator_join(
      adminConnection,
      {},
    );
    typia.assert(administrator);
    const administratorGradeId = administrator.administratorGrade.id;
    const administratorGrade =
      await api.functional.shoppingMall.administrator.administratorGrades.at(
        adminConnection,
        { administratorGradeId },
      );
    typia.assert(administratorGrade);
    TestValidator.predicate(
      "deletedAt is null",
      administratorGrade.deletedAt === null ||
        administratorGrade.deletedAt === undefined,
    );
    TestValidator.equals(
      "id matches",
      administratorGrade.id,
      administratorGradeId,
    );
    TestValidator.predicate(
      "has id",
      typeof administratorGrade.id === "string",
    );
    TestValidator.predicate(
      "has name",
      typeof administratorGrade.name === "string",
    );
    TestValidator.predicate(
      "has grade number",
      typeof administratorGrade.grade === "number",
    );
    TestValidator.predicate(
      "has superAdministrator boolean",
      typeof administratorGrade.superAdministrator === "boolean",
    );
    TestValidator.predicate(
      "has createdAt string",
      typeof administratorGrade.createdAt === "string",
    );
    TestValidator.predicate(
      "has updatedAt string",
      typeof administratorGrade.updatedAt === "string",
    );
  }
  // Scenario 2: Request non-existent administrator grade UUID returns 404
  {
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_administrator_join(adminConnection, {});
    const nonExistentId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "should return 404 for non-existent administrator grade",
      404,
      async () => {
        await api.functional.shoppingMall.administrator.administratorGrades.at(
          adminConnection,
          { administratorGradeId: nonExistentId },
        );
      },
    );
  }
  // Scenario 3: Unauthorized access returns 403 Forbidden
  {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    const someUUID = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "unauthorized access should return 403",
      403,
      async () => {
        await api.functional.shoppingMall.administrator.administratorGrades.at(
          unauthorizedConnection,
          { administratorGradeId: someUUID },
        );
      },
    );
  }
}
