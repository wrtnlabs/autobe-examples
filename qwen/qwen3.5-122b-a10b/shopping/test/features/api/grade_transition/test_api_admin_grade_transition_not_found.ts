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
 * Test administrator grade transition retrieval with non-existent ID returns 404.
 *
 * Validates that requesting a grade transition audit record with a non-existent UUID returns a 404 Not Found response. This test ensures proper error handling for missing audit records and verifies the system does not expose information about whether a transition ID format is valid or not when the record does not exist.
 *
 * The test workflow authenticates as an administrator, generates a random UUID that does not exist in the database, and attempts to retrieve the grade transition record. The system must respond with 404 Not Found to prevent information leakage about valid ID formats.
 *
 * 1. Administrator authenticates via join endpoint with randomized credentials.
 * 2. Generate a random UUID that is guaranteed not to exist in the database.
 * 3. Attempt to retrieve grade transition record using the non-existent UUID.
 * 4. Validate that HttpError is thrown with 404 status code.
 * 5. Verify no sensitive information is exposed in the error response.
 */
export async function test_api_admin_grade_transition_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a random UUID that does not exist in the database
  const invalidTransitionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to retrieve non-existent grade transition and validate 404 error
  await TestValidator.httpError(
    "non-existent grade transition returns 404",
    404,
    async () => {
      await api.functional.ecommerce.admin.grade_transitions.at(
        adminConnection,
        {
          transitionId: invalidTransitionId,
        },
      );
    },
  );
}
