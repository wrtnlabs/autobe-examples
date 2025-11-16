import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_registration_email_validation(
  connection: api.IConnection,
) {
  // Test 1: Valid email formats should succeed
  const validEmail1 = typia.random<string & tags.Format<"email">>();
  const validEmail2 = typia.random<string & tags.Format<"email">>();
  const validEmail3 = typia.random<string & tags.Format<"email">>();

  const response1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: validEmail1,
      password: "SecurePassword123!",
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(response1);
  TestValidator.equals(
    "first admin registration with valid email",
    response1.email,
    validEmail1,
  );

  const response2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: validEmail2,
      password: "SecurePassword456!",
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(response2);
  TestValidator.equals(
    "second admin registration with different valid email",
    response2.email,
    validEmail2,
  );

  // Test 2: Duplicate email prevention
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const firstRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      email: duplicateEmail,
      password: "FirstPassword123!",
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(firstRegistration);
  TestValidator.equals(
    "first admin registration with unique email",
    firstRegistration.email,
    duplicateEmail,
  );

  // Attempt to register second admin with same email
  await TestValidator.error(
    "second admin registration with duplicate email should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: duplicateEmail,
          password: "SecondPassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 3: Email format validation with another valid email
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const response3 = await api.functional.auth.admin.join(connection, {
    body: {
      email: uniqueEmail,
      password: "UniquePassword789!",
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(response3);
  TestValidator.predicate(
    "email is properly stored in admin authorized response",
    response3.email === uniqueEmail,
  );

  // Test 4: Verify token is issued upon successful registration
  TestValidator.predicate(
    "access token should be present after successful registration",
    response3.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present after successful registration",
    response3.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be set",
    response3.token.expired_at.length > 0,
  );
}
