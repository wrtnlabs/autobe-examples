import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_join_with_profile_data(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const citizenConnection: api.IConnection = { host: connection.host };
  // Generate valid test data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10); // Minimum 10 characters to ensure > 8
  const displayName = RandomGenerator.alphaNumeric(10);
  const bio = RandomGenerator.paragraph({ sentences: 5 }); // Ensures under 500 characters
  // Execute citizen join with profile data
  const result = await authorize_citizen_join(citizenConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      bio,
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Validate response structure
  typia.assert(result);
  // Verify critical properties of IAuthorized response
  TestValidator.predicate(
    "id is a valid UUID",
    /^[0-9a-f-]{36}$/i.test(result.id),
  );
  TestValidator.predicate(
    "access token is non-empty",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      result.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      result.token.refreshable_until,
    ),
  );
}
