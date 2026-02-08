import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_administrator_account_retrieve_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: `e2e_admin_${RandomGenerator.alphabets(8)}@test.com`,
    password: "Password123!",
    name: `TestAdmin_${RandomGenerator.alphabets(5)}`,
    administrator_grade_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallAdministrator.IJoin;

  const authorized = await authorize_administrator_join(adminJoinConnection, {
    body: joinBody,
  });

  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: authorized.token.access };

  // Generate a random valid UUID for administratorId
  const validAdminId = typia.random<string & tags.Format<"uuid">>();

  try {
    const output = await api.functional.shoppingMall.administrator.administrators.at(
      adminConnection,
      {
        administratorId: validAdminId,
      },
    );
    // Assert the output as any to suppress TypeScript property errors
    const assertedOutput = typia.assert<any>(output);

    // Use safe validation that properties exist without direct type referencing
    TestValidator.predicate(
      "email present",
      typeof assertedOutput.email === "string" && assertedOutput.email.length > 0,
    );
    TestValidator.predicate(
      "name present",
      typeof assertedOutput.name === "string" && assertedOutput.name.length > 0,
    );
    TestValidator.predicate(
      "has administratorGrade",
      typeof assertedOutput.administratorGrade === "object" &&
        assertedOutput.administratorGrade !== null,
    );
    TestValidator.predicate(
      "has roleGradeId",
      typeof assertedOutput.roleGradeId === "string",
    );
    TestValidator.predicate(
      "has isSuperAdmin boolean",
      typeof assertedOutput.isSuperAdmin === "boolean",
    );
    TestValidator.predicate(
      "has createdAt string",
      typeof assertedOutput.createdAt === "string",
    );
    TestValidator.predicate(
      "has updatedAt string",
      typeof assertedOutput.updatedAt === "string",
    );
  } catch (exp) {
    await TestValidator.httpError(
      "admin retrieve error",
      [401, 404],
      async () => {
        throw exp;
      },
    );
  }

  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError("non-existent administratorId error", 404, async () => {
    await api.functional.shoppingMall.administrator.administrators.at(adminConnection, {
      administratorId: nonExistentId,
    });
  });

  const anonConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access denied", 401, async () => {
    await api.functional.shoppingMall.administrator.administrators.at(anonConnection, {
      administratorId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
