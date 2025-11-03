import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_join_registration(
  connection: api.IConnection,
) {
  // 1) Prepare valid admin creation payload
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name();
  const href: string = typia.random<string & tags.Format<"uri">>();
  const referrer: string = typia.random<string & tags.Format<"uri">>();

  const createBody = {
    email: adminEmail,
    password,
    display_name: displayName,
    role: "support",
    href,
    referrer,
  } satisfies ITodoAppAdmin.ICreate;

  // 2) Call the join endpoint (happy path)
  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });

  // 3) Type-level and runtime validations
  typia.assert(authorized);

  // Business assertions
  TestValidator.equals(
    "returned email matches input",
    authorized.email,
    adminEmail,
  );
  TestValidator.equals(
    "returned display_name matches input",
    authorized.display_name,
    displayName,
  );
  TestValidator.predicate(
    "token.access is present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is present",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof authorized.is_active === "boolean",
  );

  // 4) Duplicate email must fail (uniqueness constraint)
  await TestValidator.error(
    "duplicate admin registration with same email should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: createBody,
      });
    },
  );
}
