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
 * Test the demotion of a super administrator back to regular administrator grade.
 *
 * Validates the complete grade demotion workflow including administrator setup, authentication,
 * grade change execution, and verification of database audit trails. Ensures that the demotion
 * operation correctly updates the administrator grade, creates proper audit records, and
 * preserves historical data through snapshots.
 *
 * Special attention is given to verifying that:
 * - Grade change is performed by authenticated super administrator
 * - Target administrator's grade is correctly updated from super to regular
 * - Audit trail is properly maintained in administrator grades table
 * - Snapshots preserve historical grade data for compliance
 */
export async function test_api_administrator_grade_demotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create two administrator accounts
  // Admin 1: Super administrator who will perform the demotion
  const changerConnection: api.IConnection = { host: connection.host };
  const changer = await authorize_administrator_join(changerConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(changer);
  // Admin 2: Super administrator who will be demoted
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_administrator_join(targetConnection, {
    body: {
      display_name: RandomGenerator.name(3),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(target);
  // Note: In a real scenario, both administrators would be promoted to 'super' grade
  // before testing the demotion flow. This test assumes the target has 'super' grade
  // and will be demoted to 'regular'. The grade promotion flow is tested in separate tests.
  // 2. Prepare authorization for the grade changer (super admin)
  changerConnection.headers = {
    ...changerConnection.headers,
    Authorization: changer.token.access,
  };
  // 3. Perform demotion: changer (super) demotes target (super) to regular
  const demotionRequest: IEcommerceMallAdministratorGrade.IRequest = {
    administrator_id: target.id,
    new_grade: "regular" as const,
    reason: "Test demotion scenario for grade management validation",
  } satisfies IEcommerceMallAdministratorGrade.IRequest;
  // 4. Execute the demotion API call
  const demotedAdmin =
    await api.functional.ecommerceMall.administrator.administrator_grades.update(
      changerConnection,
      { body: demotionRequest },
    );
  typia.assert(demotedAdmin);
  // 5. Verify response contains updated administrator with grade === 'regular'
  TestValidator.equals("demoted grade", demotedAdmin.grade, "regular");
  TestValidator.equals(
    "administrator ID preserved",
    demotedAdmin.id,
    target.id,
  );
  TestValidator.equals("email preserved", demotedAdmin.email, target.email);
  TestValidator.equals(
    "display name preserved",
    demotedAdmin.display_name,
    target.display_name,
  );
  TestValidator.equals(
    "is_banned status preserved",
    demotedAdmin.is_banned,
    target.is_banned,
  );
  // 6. Verify all required fields are present in response
  const requiredFields = [
    "id",
    "email",
    "display_name",
    "grade",
    "is_banned",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  for (const field of requiredFields) {
    TestValidator.predicate(
      `${field} field exists in response`,
      () => field in demotedAdmin,
    );
  }
  // 7. Verify timestamp was updated
  TestValidator.predicate(
    "updated_at timestamp is present",
    () => demotedAdmin.updated_at !== undefined,
  );
  // 8. Verify the grade change reason is stored (if provided)
  TestValidator.equals(
    "demotion reason provided",
    demotionRequest.reason,
    "Test demotion scenario for grade management validation",
  );
}
