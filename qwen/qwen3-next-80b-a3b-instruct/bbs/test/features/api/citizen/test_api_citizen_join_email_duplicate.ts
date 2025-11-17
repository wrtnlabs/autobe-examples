import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_join_email_duplicate(
  connection: api.IConnection,
) {
  const existingEmail = typia.random<string & tags.Format<"email">>();

  // First registration: Create a citizen with a unique email
  const firstCitizen: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: existingEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicBoardCitizen.ICreate,
    });
  typia.assert(firstCitizen);

  // Second registration attempt: Try to create another citizen with the same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.citizen.join(connection, {
        body: {
          email: existingEmail, // Same email as above
          password: RandomGenerator.alphaNumeric(12),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconomicBoardCitizen.ICreate,
      });
    },
  );
}
