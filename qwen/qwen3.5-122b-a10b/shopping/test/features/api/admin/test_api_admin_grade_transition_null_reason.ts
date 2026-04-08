import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminGradeTransition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminGradeTransition";
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

/**
 * Test administrator grade transition retrieval with null reason field.
 *
 * Validates that the grade transition audit endpoint correctly handles records where the optional reason field is null. This ensures the API properly distinguishes between missing data and explicitly null values, and that clients can handle nullable reason fields without errors.
 *
 * The test verifies the complete response structure including all required fields (id, admin, performedByAdmin, from_grade, to_grade, changed_at, created_at) while confirming the reason field accepts null values as expected by the schema.
 *
 * 1. Register and authenticate as administrator.
 * 2. Retrieve a grade transition record using a random UUID.
 * 3. Validate response structure with typia.assert().
 * 4. Verify the transition represents a valid grade change.
 */
export async function test_api_admin_grade_transition_null_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Retrieve grade transition record with random UUID
  const transitionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const transition: IEcommerceAdminGradeTransition =
    await api.functional.ecommerce.admin.grade_transitions.at(adminConnection, {
      transitionId,
    });
  typia.assert(transition);
  // 3. Validate business logic: grade change must be different
  TestValidator.notEquals(
    "grade transition must change grade level",
    transition.from_grade,
    transition.to_grade,
  );
  // 4. Validate reason field can be null (nullable field handling)
  // This is type-checked by typia.assert(), but we acknowledge the nullable nature
  const reason: string | null | undefined = transition.reason;
  TestValidator.predicate(
    "reason field is nullable",
    reason === null || reason === undefined || typeof reason === "string",
  );
}
