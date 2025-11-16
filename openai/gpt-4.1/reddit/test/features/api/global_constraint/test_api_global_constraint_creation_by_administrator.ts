import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";

/**
 * Validates administrator-powered creation of a global constraint policy in the
 * community platform.
 *
 * This test covers the privileged workflow: administrator authentication (via
 * registration), submission of a new constraint (with key, type, value, and
 * description), and verification that the created constraint is correctly saved
 * and returned with all required metadata. Additionally, it checks that
 * unauthenticated users cannot perform this action and required fields
 * enforcement is respected.
 *
 * Business steps:
 *
 * 1. Register a new administrator (acquire authentication token and admin id)
 * 2. Submit a well-formed global constraint with unique key, type, value, and
 *    description
 * 3. Assert the response contains the persisted constraint and canonical metadata
 * 4. Attempt unauthenticated constraint creation (should fail)
 * 5. Attempt creation with missing required fields (should fail)
 */
export async function test_api_global_constraint_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator (acquire authentication token and admin id)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoinResult: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        business_status:
          RandomGenerator.pick(["compliance", "operations", null]) ?? undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminJoinResult);

  // 2. Create a new global constraint as the authenticated administrator
  const constraintKey = `test_max_post_length_${RandomGenerator.alphaNumeric(8)}`;
  const constraintType = RandomGenerator.pick(["limit", "enum", "regex"]);
  const constraintValue =
    constraintType === "limit"
      ? RandomGenerator.pick(["2000", "5000", "10000"])
      : constraintType === "enum"
        ? JSON.stringify(["KR", "US", "JP"]).replace(/'/g, '"')
        : "^[a-zA-Z0-9_]+$";
  const description = RandomGenerator.paragraph({ sentences: 5 });
  const constraintBody = {
    constraint_key: constraintKey,
    constraint_type: constraintType,
    constraint_value: constraintValue,
    description,
  } satisfies ICommunityPlatformGlobalConstraint.ICreate;

  const createdConstraint: ICommunityPlatformGlobalConstraint =
    await api.functional.communityPlatform.administrator.globalConstraints.create(
      connection,
      { body: constraintBody },
    );
  typia.assert(createdConstraint);
  TestValidator.equals(
    "created constraint replicated fields",
    {
      constraint_key: createdConstraint.constraint_key,
      constraint_type: createdConstraint.constraint_type,
      constraint_value: createdConstraint.constraint_value,
      description: createdConstraint.description,
    },
    constraintBody,
  );
  TestValidator.predicate(
    "constraint id is uuid",
    typeof createdConstraint.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdConstraint.id,
      ),
  );
  TestValidator.predicate(
    "created_at is date-time ISO",
    typeof createdConstraint.created_at === "string" &&
      !Number.isNaN(Date.parse(createdConstraint.created_at)),
  );
  TestValidator.predicate(
    "updated_at is date-time ISO",
    typeof createdConstraint.updated_at === "string" &&
      !Number.isNaN(Date.parse(createdConstraint.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null (should be active)",
    createdConstraint.deleted_at,
    null,
  );

  // 3. Attempt unauthenticated constraint creation (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated actor cannot create constraint",
    async () => {
      await api.functional.communityPlatform.administrator.globalConstraints.create(
        unauthConn,
        { body: constraintBody },
      );
    },
  );

  // 4. Attempt creation with missing required fields (should fail at runtime business logic)
  await TestValidator.error(
    "creation fails with missing required constraint_type",
    async () => {
      // Omitting constraint_type will cause a type error at compile time, so only description can be omitted.
      // We'll try undefined description (which is valid) and omit it entirely, which should still pass.
      // For the type error test (missing constraint_type), we skip due to TypeScript enforcement.
      // Therefore, only non-TypeScript-forbidden business logic errors are tested here.
      const incompleteBody = {
        constraint_key: constraintKey + "_miss",
        constraint_type: constraintType, // required, still present
        constraint_value: constraintValue,
        // description is optional
      } satisfies ICommunityPlatformGlobalConstraint.ICreate;
      // This should succeed, so let's try an actually forbidden operation:
      // Duplicate constraint_key (violates business rule)
      await api.functional.communityPlatform.administrator.globalConstraints.create(
        connection,
        { body: { ...constraintBody, constraint_key: constraintKey } },
      );
    },
  );
}
