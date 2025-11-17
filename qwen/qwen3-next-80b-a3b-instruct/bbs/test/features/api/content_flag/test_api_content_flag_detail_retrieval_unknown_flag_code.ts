import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardContentFlag";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_content_flag_detail_retrieval_unknown_flag_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Attempt to retrieve a non-existent flag code
  const unknownFlagCode: string = RandomGenerator.alphaNumeric(10); // Random string guaranteed not to exist as a flag code
  await TestValidator.error(
    "should return 404 for non-existent flag code",
    async () => {
      await api.functional.economicBoard.moderator.settings.contentFlags.at(
        connection,
        {
          flagCode: unknownFlagCode,
        },
      );
    },
  );
}
