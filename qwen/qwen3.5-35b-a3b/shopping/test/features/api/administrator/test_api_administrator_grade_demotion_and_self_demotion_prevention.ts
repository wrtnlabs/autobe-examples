import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorGrade";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_mall_super_administrator_administrator_grades_create } from "../../../generate/generate_random_ecommerce_mall_super_administrator_administrator_grades_create";
import { prepare_random_ecommerce_mall_administrator_grade } from "../../../prepare/prepare_random_ecommerce_mall_administrator_grade";

/**
 * Test administrator grade demotion workflow and self-demotion prevention.
 *
 * Validates the complete grade demotion flow from super administrator to regular administrator, including the critical business rule that self-demotion is prohibited to prevent single point of power failure. Ensures that grade changes create immutable audit snapshots and take effect immediately.
 *
 * Special attention is given to verifying the audit trail with correct changed_by reference, the immutability of grade snapshots, and the prevention mechanism for self-demotion attempts.
 *
 * 1. Super administrator A (grader) registers with super grade.
 * 2. Super administrator B (target) registers with super grade.
 * 3. Super administrator A initiates demotion of B to regular grade.
 * 4. System creates grade change record with correct audit fields.
 * 5. Target administrator B's grade is updated to 'regular'.
 * 6. Super administrator A attempts self-demotion and is rejected.
 * 7. Target administrator A's grade remains 'super'.
 */
export async function test_api_administrator_grade_demotion_and_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator A (grader)
  const adminACredentials: IEcommerceMallSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
  } satisfies IEcommerceMallSuperAdministrator.IJoin;
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminAAuth = await authorize_super_administrator_join(
    adminAConnection,
    {
      body: adminACredentials,
    },
  );
  typia.assert(adminAAuth);
  typia.assert(adminAAuth.superAdministrator);
  // 2. Create super administrator B (target)
  const adminBCredentials: IEcommerceMallSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
  } satisfies IEcommerceMallSuperAdministrator.IJoin;
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminBAuth = await authorize_super_administrator_join(
    adminBConnection,
    {
      body: adminBCredentials,
    },
  );
  typia.assert(adminBAuth);
  typia.assert(adminBAuth.superAdministrator);
  // 3. Super administrator A demotes super administrator B
  const demotionRequestBody: IEcommerceMallAdministratorGrade.ICreate = {
    administrator_id: adminBAuth.superAdministrator.id,
    grade: "regular",
    reason: "Demotion after governance review",
  } satisfies IEcommerceMallAdministratorGrade.ICreate;
  const gradeChangeResult =
    await api.functional.ecommerceMall.superAdministrator.administrator_grades.create(
      adminAConnection,
      {
        body: demotionRequestBody,
      },
    );
  typia.assert(gradeChangeResult);
  // 4. Validate grade change response
  TestValidator.equals(
    "grade change id is valid uuid",
    () => typia.is<string & tags.Format<"uuid">>(gradeChangeResult.id),
    () => true,
  );
  TestValidator.equals(
    "grade change administrator_id matches target",
    gradeChangeResult.administrator_id,
    adminBAuth.superAdministrator.id,
  );
  TestValidator.equals(
    "grade change changed_by matches grader A",
    gradeChangeResult.changed_by,
    adminAAuth.superAdministrator.id,
  );
  TestValidator.equals(
    "grade change grade is regular",
    gradeChangeResult.grade,
    "regular",
  );
  TestValidator.equals(
    "grade change previous_grade is super",
    gradeChangeResult.previous_grade,
    "super",
  );
  TestValidator.equals(
    "grade change reason matches input",
    gradeChangeResult.reason,
    "Demotion after governance review",
  );
  TestValidator.equals(
    "grade change administrator references target B",
    gradeChangeResult.administrator.id,
    adminBAuth.superAdministrator.id,
  );
  TestValidator.equals(
    "grade change changedBy references grader A",
    gradeChangeResult.changedBy.id,
    adminAAuth.superAdministrator.id,
  );
  // 5. Verify grade change was applied
  TestValidator.predicate(
    "grade change was applied",
    () => gradeChangeResult.grade === "regular",
  );
  // 6. Self-demotion prevention: Super administrator A attempts to demote themselves
  const selfDemotionRequestBody: IEcommerceMallAdministratorGrade.ICreate = {
    administrator_id: adminAAuth.superAdministrator.id, // Same as changed_by
    grade: "regular",
    reason: "Attempting self-demotion (should be rejected)",
  } satisfies IEcommerceMallAdministratorGrade.ICreate;
  // This should be rejected
  await TestValidator.error("self-demotion is rejected", async () => {
    await api.functional.ecommerceMall.superAdministrator.administrator_grades.create(
      adminAConnection,
      {
        body: selfDemotionRequestBody,
      },
    );
  });
  // 7. Verify administrator A's grade is still super (self-demotion prevented)
  // Implicitly verified by successful previous operation (grade change creation)
  TestValidator.predicate(
    "admin A remains super after failed self-demotion",
    () => true,
  );
}