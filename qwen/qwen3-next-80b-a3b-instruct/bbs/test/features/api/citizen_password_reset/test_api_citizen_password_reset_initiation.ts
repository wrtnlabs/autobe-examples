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

export async function test_api_citizen_password_reset_initiation(
  connection: api.IConnection,
): Promise<void> {
  // Create a new citizen user for testing
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(joinResult);
  // Initiate password reset for the created citizen
  const resetResponse =
    await api.functional.economicBoard.citizen.password_resets.requestReset(
      citizenConnection,
      {
        body: {} satisfies IEconomicBoardCitizenPasswordReset.IRequest,
      },
    );
  typia.assert(resetResponse);
}
