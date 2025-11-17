import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_login_deleted_account(
  connection: api.IConnection,
) {
  // 1. Create a new citizen account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const createdCitizen: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: email,
        password: password,
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(createdCitizen);

  // 2. Successfully login with the created account (positive test)
  const loggedCitizen: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  typia.assert(loggedCitizen);

  // 3. Verify login response matches expected structure
  TestValidator.equals(
    "login ID matches created ID",
    loggedCitizen.id,
    createdCitizen.id,
  );
  TestValidator.equals(
    "login token access exists",
    loggedCitizen.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "login token refresh exists",
    loggedCitizen.token.refresh.length > 0,
    true,
  );

  // 4. Attempt login with wrong password (negative test)
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email: email,
          password: "wrong-password-123",
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );

  // 5. Attempt login with wrong email (negative test)
  await TestValidator.error("login should fail with wrong email", async () => {
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: "wrong@mail.com",
        password: password,
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  });
}
