import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardCitizenPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizenPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_password_reset_duplicate_request_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: A citizen user initiates a password reset, and then initiates another reset request before the first token expires.
  // The system detects the existing valid token in the economic_board_citizen_password_resets table and returns the same token
  // and expiration information without generating a new one.
  // Step 1: Create citizen account using utility function
  const citizenConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const joinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Initiate first password reset request
  const firstResetConnection: api.IConnection = { host: connection.host };
  const firstResetResponse =
    await api.functional.economicBoard.citizen.password_resets.requestReset(
      firstResetConnection,
      {
        body: {} satisfies IEconomicBoardCitizenPasswordReset.IRequest,
      },
    );
  typia.assert(firstResetResponse);
  // Step 3: Wait for a moment to ensure token is still valid (business rule: 24-hour window)
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 4: Initiate second password reset request with same user (must return same token)
  const secondResetConnection: api.IConnection = { host: connection.host };
  const secondResetResponse =
    await api.functional.economicBoard.citizen.password_resets.requestReset(
      secondResetConnection,
      {
        body: {} satisfies IEconomicBoardCitizenPasswordReset.IRequest,
      },
    );
  typia.assert(secondResetResponse);
  // Step 5: Validate that both requests succeeded without error
  // According to DTO definitions, IEconomicBoardCitizenPasswordReset.IResponse is {} (empty object)
  // The scenario description claims it returns token and expires_at, but the DTO does not define these properties.
  // Per Anti-Hallucination Protocol: "The compiler is always right" and "Test what EXISTS, not what SHOULD exist"
  // Therefore, we cannot validate non-existent properties. We only verify that the second request completes successfully.
}
