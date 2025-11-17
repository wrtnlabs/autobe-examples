import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_profile_retrieval_by_id(
  connection: api.IConnection,
) {
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies IEconomicBoardModerator.ICreate;

  const createdModerator: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(createdModerator);

  const retrievedModerator: IEconomicBoardModerator =
    await api.functional.economicBoard.moderator.moderators.at(connection, {
      moderatorId: createdModerator.id,
    });
  typia.assert(retrievedModerator);

  TestValidator.equals(
    "retrieved moderator ID matches created ID",
    retrievedModerator,
    createdModerator.id,
  );
}
