import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";

/**
 * Authenticate as administrator and update or upsert a global constraint by
 * unique key.
 *
 * 1. Register a new administrator using random email and password.
 * 2. Use admin credentials to perform a global constraint PUT with a randomly
 *    generated key and all required fields (type, value).
 * 3. Assert response: entity is returned with id, constraint_key, constraint_type,
 *    constraint_value, and correct timestamps; all request-provided values
 *    appear in the result.
 * 4. Repeat the PUT for the same key with a different value to verify update (not
 *    create) and confirm the returned entity reflects the updates.
 */
export async function test_api_global_constraint_update_or_upsert_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status:
        RandomGenerator.pick([undefined, null, "superadmin", "onboarding"]) ??
        undefined,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Upsert a global constraint (first: create)
  const constraintKey = RandomGenerator.alphaNumeric(10);
  const initialConstraint = {
    constraint_key: constraintKey,
    constraint_type: RandomGenerator.pick(["limit", "enum", "regex"]),
    constraint_value: RandomGenerator.paragraph(),
    description:
      RandomGenerator.pick([
        "Maximum posts per day",
        "Allowed languages list",
        "Password regex policy",
        null,
        undefined,
      ]) ?? undefined,
  } satisfies ICommunityPlatformGlobalConstraint.IUpdate;

  const createdConstraint =
    await api.functional.communityPlatform.administrator.globalConstraints.update(
      connection,
      {
        constraintKey: constraintKey,
        body: initialConstraint,
      },
    );
  typia.assert(createdConstraint);
  TestValidator.equals(
    "constraint_key matches",
    createdConstraint.constraint_key,
    constraintKey,
  );
  TestValidator.equals(
    "constraint_type matches",
    createdConstraint.constraint_type,
    initialConstraint.constraint_type,
  );
  TestValidator.equals(
    "constraint_value matches",
    createdConstraint.constraint_value,
    initialConstraint.constraint_value,
  );
  TestValidator.equals(
    "description matches",
    createdConstraint.description,
    initialConstraint.description ?? null,
  );

  // 3. Upsert on same key (should update, not create new id)
  const updatedConstraintBody = {
    constraint_key: constraintKey,
    constraint_type: RandomGenerator.pick(["limit", "enum", "regex"]),
    constraint_value: RandomGenerator.paragraph({ sentences: 8 }),
    description:
      RandomGenerator.pick([
        "Updated constraint description",
        null,
        undefined,
      ]) ?? undefined,
  } satisfies ICommunityPlatformGlobalConstraint.IUpdate;

  const updatedConstraint =
    await api.functional.communityPlatform.administrator.globalConstraints.update(
      connection,
      {
        constraintKey: constraintKey,
        body: updatedConstraintBody,
      },
    );
  typia.assert(updatedConstraint);
  TestValidator.equals(
    "constraint_key unchanged after update",
    updatedConstraint.constraint_key,
    constraintKey,
  );
  TestValidator.equals(
    "constraint_type updated",
    updatedConstraint.constraint_type,
    updatedConstraintBody.constraint_type,
  );
  TestValidator.equals(
    "constraint_value updated",
    updatedConstraint.constraint_value,
    updatedConstraintBody.constraint_value,
  );
  TestValidator.equals(
    "description updated",
    updatedConstraint.description,
    updatedConstraintBody.description ?? null,
  );
  TestValidator.equals(
    "id unchanged after update",
    updatedConstraint.id,
    createdConstraint.id,
  );
}
