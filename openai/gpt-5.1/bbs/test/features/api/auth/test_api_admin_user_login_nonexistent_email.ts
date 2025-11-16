import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

export async function test_api_admin_user_login_nonexistent_email(
  connection: api.IConnection,
) {
  // 1. Prepare base and unauthenticated connections
  const baseConnection: api.IConnection = connection;
  const unauthenticatedForNegative: api.IConnection = {
    ...baseConnection,
    headers: {},
  };

  // 2. Generate two distinct admin emails
  const existingEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const nonexistentEmail: string & tags.Format<"email"> = (() => {
    let email: string & tags.Format<"email">;
    while (true) {
      const candidate = typia.random<string & tags.Format<"email">>();
      if (candidate !== existingEmail) {
        email = candidate;
        break;
      }
    }
    return email;
  })();

  // 3. Create a control admin account with a different email
  const joinRequestForExisting = {
    ...typia.random<IDiscussionBoardAdminUserJoin.IRequest>(),
    email: existingEmail,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const existingAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(baseConnection, {
      body: joinRequestForExisting,
    });
  typia.assert(existingAdmin);

  // 4. Attempt login with non-existent email on unauthenticated connection
  //    Expect authentication failure (some error), but do not inspect status code
  const randomPasswordForNegative: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 16,
  });

  await TestValidator.error(
    "login with non-existent admin email should fail",
    async () => {
      const loginRequestForNonexistent = {
        email: nonexistentEmail,
        password: randomPasswordForNegative,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdminUserLogin.IRequest;

      await api.functional.auth.adminUser.login(unauthenticatedForNegative, {
        body: loginRequestForNonexistent,
      });
    },
  );

  // 5. Create an admin using the previously non-existent email
  const joinPasswordForNonexistent: string & tags.Format<"password"> =
    typia.random<string & tags.Format<"password">>();

  const joinRequestForNonexistent = {
    ...typia.random<IDiscussionBoardAdminUserJoin.IRequest>(),
    email: nonexistentEmail,
    password: joinPasswordForNonexistent,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const newlyCreatedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(baseConnection, {
      body: joinRequestForNonexistent,
    });
  typia.assert(newlyCreatedAdmin);

  // 6. Attempt login again with the now-existing email and correct password
  const unauthenticatedForPositive: api.IConnection = {
    ...baseConnection,
    headers: {},
  };

  const loginRequestForExistingNow = {
    email: nonexistentEmail,
    password: joinPasswordForNonexistent,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const loginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(unauthenticatedForPositive, {
      body: loginRequestForExistingNow,
    });
  typia.assert(loginResult);

  // 7. Verify that the successful login corresponds to the expected email
  TestValidator.equals(
    "successful admin login should return profile for the requested email",
    loginResult.email,
    nonexistentEmail,
  );
}
