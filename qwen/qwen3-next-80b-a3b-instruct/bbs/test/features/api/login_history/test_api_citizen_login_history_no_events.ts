import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_user } from "../../../prepare/prepare_random_discussion_board_user";
import { generate_random_discussion_board_users_create } from "../../../generate/generate_random_discussion_board_users_create";
export async function test_api_citizen_login_history_no_events(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new citizen account with no prior authentication events
  const citizenConnection: api.IConnection = { host: connection.host };
  const createdCitizen: IDiscussionBoardUser =
    await generate_random_discussion_board_users_create(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(8),
      },
    });
  typia.assert(createdCitizen);
  // Step 2: Retrieve the login history for the newly created citizen
  // According to the scenario and API description, this should return an array of authentication logs
  // Workaround: The SDK type definition is incorrect (says IDiscussionBoardAuthenticationLog but should be array)
  // Use typia.assert to validate the actual runtime type as an array
  const loginHistoryRaw =
    await api.functional.discussionBoard.citizens.login_history.index(
      citizenConnection,
      {
        citizenId: createdCitizen.id,
      },
    );
  const loginHistory: IDiscussionBoardAuthenticationLog[] =
    typia.assert<IDiscussionBoardAuthenticationLog[]>(loginHistoryRaw);
  // Step 3: Validate that the login history is an empty array
  TestValidator.equals(
    "login history should be empty for new citizen",
    loginHistory.length,
    0,
  );
}
