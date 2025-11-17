import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_join_referrer_invalid_url(
  connection: api.IConnection,
) {
  // Test case 1: Registration with empty referrer (valid case)
  const emptyReferrerEmail = typia.random<string & tags.Format<"email">>();
  const emptyReferrerPassword = RandomGenerator.alphabets(12);

  const emptyReferrerResult: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: emptyReferrerEmail,
        password: emptyReferrerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "", // Empty string referrer - should be valid
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(emptyReferrerResult);

  // Test case 2: Registration with malformed referrer (invalid case)
  const malformedReferrerEmail = typia.random<string & tags.Format<"email">>();
  const malformedReferrerPassword = RandomGenerator.alphabets(12);

  await TestValidator.error("malformed referrer URL should fail", async () => {
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: malformedReferrerEmail,
        password: malformedReferrerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "malformed-url", // Non-URL string - should be rejected
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  });
}
