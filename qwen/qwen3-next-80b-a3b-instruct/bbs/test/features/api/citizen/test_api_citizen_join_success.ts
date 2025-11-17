import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_join_success(
  connection: api.IConnection,
) {
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const href: string = typia.random<string & tags.Format<"url">>();
  const referrer: string = typia.random<string & tags.Format<"url">>();

  const output: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(output);

  TestValidator.equals(
    "citizen ID is a UUID",
    output.id,
    typia.assert<string & tags.Format<"uuid">>(output.id),
  );
  TestValidator.equals(
    "access token is a valid JWT",
    output.token.access,
    typia.assert<string>(output.token.access),
  );
  TestValidator.equals(
    "refresh token is a valid JWT",
    output.token.refresh,
    typia.assert<string>(output.token.refresh),
  );
  TestValidator.equals(
    "expired_at is a date-time string",
    output.token.expired_at,
    typia.assert<string & tags.Format<"date-time">>(output.token.expired_at),
  );
  TestValidator.equals(
    "refreshable_until is a date-time string",
    output.token.refreshable_until,
    typia.assert<string & tags.Format<"date-time">>(
      output.token.refreshable_until,
    ),
  );
}
