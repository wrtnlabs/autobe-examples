import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // First, register a new moderator with a unique email
  const initialEmail: string = typia.random<string & tags.Format<"email">>();
  const initialModerator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: initialEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(initialModerator);

  // Now attempt to register another moderator with the same email
  // This should fail with a duplicate email error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: initialEmail, // Same email as above
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconomicBoardModerator.ICreate,
      });
    },
  );
}
