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

/**
 * Test grade change record retrieval with nested administrator data validation.
 *
 * Validates the retrieval of an administrator grade change record and ensures that the nested administrator relationship data is correctly populated and matches the referenced accounts. The test assumes a pre-existing grade change record in the test database, as grade promotion is not available through the public API endpoints.
 *
 * Special attention is given to validating that the nested administrator objects (target administrator and changer) are complete summaries with accurate data, and that the foreign key references match the nested object IDs.
 *
 * 1. Creates a super administrator account (regular grade initially).
 * 2. Creates a regular administrator account.
 * 3. Logs in as super administrator to obtain authentication.
 * 4. Retrieves a pre-existing grade change record from the database.
 * 5. Validates nested administrator objects match the referenced IDs and data.
 * 6. Cross-validates administrator_id and changed_by with nested object IDs.
 * 7. Verifies nested objects contain complete summary information.
 */
export async function test_api_administrator_grade_nested_data_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminPassword = RandomGenerator.alphaNumeric(12);
  const superAdmin = await authorize_administrator_join(
    superAdminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: superAdminPassword,
      },
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create regular administrator account
  const regularAdminJoinConnection: api.IConnection = { host: connection.host };
  const regularAdminPassword = RandomGenerator.alphaNumeric(12);
  const regularAdmin = await authorize_administrator_join(
    regularAdminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: regularAdminPassword,
      },
    },
  );
  typia.assert(regularAdmin);
  // Step 3: Login as super administrator to get authentication token
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdmin.email,
      password: superAdminPassword,
      ip: "127.0.0.1",
      referrer: "http://localhost:3000/admin",
    },
  });
  // Step 4: Retrieve a grade change record (assumes pre-existing in test database)
  // The test database should have a grade change record for this scenario
  const gradeChangeId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000001" as string & tags.Format<"uuid">;
  const gradeChangeRecord =
    await api.functional.ecommerceMall.administrator.administrator_grades.at(
      superAdminLoginConnection,
      { gradeChangeId },
    );
  typia.assert(gradeChangeRecord);
  // Step 5: Cross-validate administrator_id with nested administrator object
  TestValidator.equals(
    "administrator_id matches nested administrator id",
    gradeChangeRecord.administrator_id,
    gradeChangeRecord.administrator.id,
  );
  // Step 6: Cross-validate changed_by with nested changedBy object
  TestValidator.equals(
    "changed_by matches nested changedBy id",
    gradeChangeRecord.changed_by,
    gradeChangeRecord.changedBy.id,
  );
  // Step 7: Validate target administrator's email matches
  TestValidator.equals(
    "administrator email matches nested administrator email",
    gradeChangeRecord.administrator.email,
    regularAdmin.email,
  );
  // Step 8: Validate target administrator's displayName matches
  TestValidator.equals(
    "administrator displayName matches nested administrator displayName",
    gradeChangeRecord.administrator.displayName,
    regularAdmin.display_name,
  );
  // Step 9: Validate changedBy's email is valid format
  TestValidator.predicate("changedBy email is valid format", () =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      gradeChangeRecord.changedBy.email,
    ),
  );
  // Step 10: Validate changedBy has super grade
  TestValidator.equals(
    "changedBy grade is super",
    gradeChangeRecord.changedBy.grade,
    "super",
  );
  // Step 11: Validate target administrator has grade field set
  TestValidator.predicate(
    "nested administrator grade is defined",
    () => gradeChangeRecord.administrator.grade !== undefined,
  );
  // Step 12: Validate both nested objects have all required summary fields
  const requiredSummaryFields = [
    "id",
    "email",
    "displayName",
    "grade",
    "isBanned",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ] as const;
  for (const field of requiredSummaryFields) {
    TestValidator.predicate(
      `nested administrator has ${field} field`,
      () => field in gradeChangeRecord.administrator,
    );
  }
  for (const field of requiredSummaryFields) {
    TestValidator.predicate(
      `nested changedBy has ${field} field`,
      () => field in gradeChangeRecord.changedBy,
    );
  }
}
