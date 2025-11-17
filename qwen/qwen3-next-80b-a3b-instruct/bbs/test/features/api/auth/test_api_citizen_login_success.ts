import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_login_success(
  connection: api.IConnection,
) {
  const citizen: IEconomicBoardCitizen.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  };

  const registered: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: citizen,
    });
  typia.assert(registered);

  const logged: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: citizen.email,
        password: citizen.password,
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  typia.assert(logged);

  TestValidator.equals(
    "login response id matches registered id",
    logged.id,
    registered.id,
  );
  TestValidator.equals(
    "access token exists",
    logged.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    logged.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "access token expires in future",
    () => new Date(logged.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token is valid in future",
    () => new Date(logged.token.refreshable_until) > new Date(),
  );
}
