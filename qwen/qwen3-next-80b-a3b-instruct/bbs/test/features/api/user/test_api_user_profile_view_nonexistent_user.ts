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

export async function test_api_user_profile_view_nonexistent_user(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const authenticatedUser = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(authenticatedUser);
  // Invalid UUID format (invalid UUID)
  const invalidUserId = "invalid-uuid-format";
  // Attempt to view profile with invalid UUID
  await TestValidator.httpError(
    "should return 404 for non-existent user",
    404,
    async () => {
      await api.functional.economicBoard.users.at(citizenConnection, {
        userId: invalidUserId,
      });
    },
  );
}
