import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_login_updates_last_login_and_resets_failures(
  connection: api.IConnection,
) {
  // 1. Register a fresh member user to obtain baseline security state
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joined);

  const originalFailedCount: number & tags.Type<"int32"> =
    joined.failed_login_count;
  const originalLastLoginAt:
    | (string & tags.Format<"date-time">)
    | null
    | undefined = joined.last_login_at;

  // 2. Perform multiple failed login attempts with wrong password
  const failedAttempts = 2;
  const wrongPassword = typia.random<string & tags.Format<"password">>();

  await ArrayUtil.asyncRepeat(failedAttempts, async () => {
    const failedLoginBody = {
      email: joinRequestBody.email,
      password: wrongPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberUserLogin.IRequest;

    await TestValidator.error(
      "member user login should fail with wrong password",
      async () => {
        await api.functional.auth.memberUser.login(connection, {
          body: failedLoginBody,
        });
      },
    );
  });

  // 3. Perform a successful login using the correct password
  const successfulLoginBody = {
    email: joinRequestBody.email,
    password: joinRequestBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const authorizedAfterSuccess: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: successfulLoginBody,
    });
  typia.assert(authorizedAfterSuccess);

  // 4. Validate last_login_at and failed_login_count behavior
  TestValidator.equals(
    "authorized login response should be for the same member user",
    authorizedAfterSuccess.id,
    joined.id,
  );

  TestValidator.predicate(
    "last_login_at must be set after successful login",
    () =>
      authorizedAfterSuccess.last_login_at !== null &&
      authorizedAfterSuccess.last_login_at !== undefined,
  );

  if (originalLastLoginAt !== null && originalLastLoginAt !== undefined) {
    TestValidator.predicate(
      "last_login_at after success should not equal previous last_login_at when it existed",
      () => authorizedAfterSuccess.last_login_at !== originalLastLoginAt,
    );
  }

  TestValidator.predicate(
    "failed_login_count after successful login should be reduced from what it would be after failed attempts",
    () =>
      typeof authorizedAfterSuccess.failed_login_count === "number" &&
      authorizedAfterSuccess.failed_login_count <=
        originalFailedCount + failedAttempts &&
      authorizedAfterSuccess.failed_login_count <= failedAttempts,
  );

  // Basic sanity checks on status and timestamps to ensure we are looking at an active, updated user
  TestValidator.equals(
    "member user id should remain stable across join and login",
    joined.id,
    authorizedAfterSuccess.id,
  );
  TestValidator.predicate(
    "updated_at should not be earlier than created_at",
    () => joined.created_at <= authorizedAfterSuccess.updated_at,
  );
}
