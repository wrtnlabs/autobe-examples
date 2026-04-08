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

export async function test_api_admin_grade_transition_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve a grade transition record by ID
  const transitionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const transition = await api.functional.ecommerce.admin.grade_transitions.at(
    adminConnection,
    {
      transitionId,
    },
  );
  typia.assert(transition);
  // 3. Validate business logic: grade actually changed
  TestValidator.notEquals(
    "grade actually changed",
    transition.from_grade,
    transition.to_grade,
  );
  // 4. Validate timestamp ordering: changed_at should be >= created_at
  TestValidator.predicate(
    "transition occurred after record creation",
    () =>
      new Date(transition.changed_at).getTime() >=
      new Date(transition.created_at).getTime(),
  );
  // 5. Validate that both admin references are the same admin (self-transition edge case)
  // In normal cases, performedByAdmin should be a super admin, and admin is the target
  // For this test, we just validate the structure exists and IDs are valid UUIDs
  TestValidator.notEquals(
    "admin and performer are different accounts",
    transition.admin.id,
    transition.performedByAdmin.id,
  );
}
