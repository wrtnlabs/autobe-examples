import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_join_href_invalid_url(
  connection: api.IConnection,
) {
  // Create registration data with invalid href (malformed URL without scheme)
  const invalidHref = "example.com"; // Not a valid URL - missing scheme
  const requestData: IEconomicBoardCitizen.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    href: invalidHref, // This should be rejected
    referrer: "https://example.com/referrer",
  };

  // Verify that attempting registration with invalid href fails
  await TestValidator.error(
    "invalid href should fail registration",
    async () => {
      await api.functional.auth.citizen.join(connection, {
        body: requestData,
      });
    },
  );
}
