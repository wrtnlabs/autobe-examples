import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardContentFlag";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_content_flag_detail_retrieval_by_code(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconomicBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve a specific content flag by code
  const flagCode: string = "hate_speech";
  const flag: IEconomicBoardContentFlag =
    await api.functional.economicBoard.moderator.settings.contentFlags.at(
      connection,
      {
        flagCode,
      },
    );
  typia.assert(flag);

  // Step 3: Validate that the flag response is a string with the exact flag code
  TestValidator.equals("flag response matches expected code", flag, flagCode);
}
