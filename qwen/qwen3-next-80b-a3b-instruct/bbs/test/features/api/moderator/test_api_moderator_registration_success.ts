import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_registration_success(
  connection: api.IConnection,
) {
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);

  const response: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        password,
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(response);

  TestValidator.predicate(
    "access token expires in future",
    new Date(response.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token is valid until future",
    new Date(response.token.refreshable_until) > new Date(),
  );
}
