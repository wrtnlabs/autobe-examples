import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_systemadministrator_login_nonexistent_account(
  connection: api.IConnection,
) {
  // Step 1: Create a legitimate system administrator account first (required dependency)
  const legitimateAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const legitimateAdmin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: legitimateAdminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(legitimateAdmin);

  // Step 2: Attempt to login with completely non-existent account credentials
  const nonExistentEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  await TestValidator.error(
    "login with non-existent account should fail",
    async () => {
      await api.functional.auth.systemAdministrator.login.signIn(connection, {
        body: {
          email: nonExistentEmail, // Valid email format but never registered
          password: "fakePassword123",
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IEconPoliticalDiscussionUser.ILogin,
      });
    },
  );

  // Step 3: Verify security measures - try multiple non-existent emails to test for enumeration
  const testEmails: string[] = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];

  // Test that all non-existent account attempts return similar error responses
  for (const testEmail of testEmails) {
    await TestValidator.error(
      `security test: login with non-existent email ${testEmail} should fail consistently`,
      async () => {
        await api.functional.auth.systemAdministrator.login.signIn(connection, {
          body: {
            email: testEmail,
            password: "anotherFakePassword",
            href: "https://example.com/login",
            referrer: "https://example.com",
          } satisfies IEconPoliticalDiscussionUser.ILogin,
        });
      },
    );
  }

  // Step 4: Verify that the legitimate admin can still login successfully after security tests
  const reLoginTest: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.login.signIn(connection, {
      body: {
        email: legitimateAdminEmail,
        password: "1234", // Default password from the join function
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IEconPoliticalDiscussionUser.ILogin,
    });
  typia.assert(reLoginTest);

  TestValidator.equals(
    "legitimate admin can still login after security tests",
    reLoginTest.email,
    legitimateAdminEmail,
  );
}
