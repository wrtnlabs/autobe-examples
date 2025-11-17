import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a valid citizen account
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "ValidPassword123!";
  const href: string = "https://example.com/join";
  const referrer: string = "https://example.com/home";

  const joinedCitizen: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(joinedCitizen);

  // Step 2: Attempt to login with incorrect password
  await TestValidator.error(
    "should fail login with invalid password",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email,
          password: "WrongPassword456!", // Incorrect password
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );
}
