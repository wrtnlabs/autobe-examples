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

export async function test_api_administrator_administrator_grade_update_no_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(adminAuthorized);
  // 2. Retrieve one existing administrator grade to test
  // Since there's no direct retrieval API for admin grades,
  // we rely on partial update with valid UUID and empty update or partial update
  // We simulate existing grade by first updating with empty object to get current data
  // Using a random valid UUID to simulate a valid id for test;
  // In real scenario, admin grades should exist beforehand.
  const existingAdministratorGradeId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Update with empty body should return existing data unchanged
  const emptyUpdateBody: IShoppingMallAdministratorGrade.IUpdate = {};
  const updatedWithEmpty =
    await api.functional.shoppingMall.administrator.administratorGrades.updateAdministratorGrade(
      adminConnection,
      {
        administratorGradeId: existingAdministratorGradeId,
        body: emptyUpdateBody,
      },
    );
  typia.assert(updatedWithEmpty);
  // 4. Update with partial body (only name) should update partial, fields omitted unchanged
  const partialUpdateBody: IShoppingMallAdministratorGrade.IUpdate = {
    name: "partial update test",
  };
  const updatedWithPartial =
    await api.functional.shoppingMall.administrator.administratorGrades.updateAdministratorGrade(
      adminConnection,
      {
        administratorGradeId: existingAdministratorGradeId,
        body: partialUpdateBody,
      },
    );
  typia.assert(updatedWithPartial);
  // 5. Assert that for empty update, the response matches for omitted fields
  // (we expect no field to have changed except possibly timestamps updatedAt)
  // For partial update, name changes, others should remain same
  // As we do not have the existing original data directly, we test the common invariants:
  TestValidator.predicate(
    "empty update returns valid grade id",
    typeof updatedWithEmpty.id === "string" && updatedWithEmpty.id.length > 0,
  );
  TestValidator.equals(
    "partial update reflects name change",
    updatedWithPartial.name,
    partialUpdateBody.name,
  );
  TestValidator.equals(
    "partial update id unchanged",
    updatedWithEmpty.id,
    updatedWithPartial.id,
  );
  TestValidator.predicate(
    "partial update grade unchanged",
    updatedWithEmpty.grade === updatedWithPartial.grade,
  );
  TestValidator.predicate(
    "partial update superAdministrator unchanged",
    updatedWithEmpty.superAdministrator ===
      updatedWithPartial.superAdministrator,
  );
  TestValidator.predicate(
    "partial update timestamps updatedAt changed",
    updatedWithEmpty.updatedAt !== updatedWithPartial.updatedAt,
  );
  TestValidator.predicate(
    "partial update createdAt unchanged",
    updatedWithEmpty.createdAt === updatedWithPartial.createdAt,
  );
  // 6. Confirm only administrators can perform update (simulate unauthorized access)
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-authorized update should fail", async () => {
    await api.functional.shoppingMall.administrator.administratorGrades.updateAdministratorGrade(
      invalidConnection,
      {
        administratorGradeId: existingAdministratorGradeId,
        body: emptyUpdateBody,
      },
    );
  });
}
