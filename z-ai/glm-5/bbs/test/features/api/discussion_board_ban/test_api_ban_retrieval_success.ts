import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test successful retrieval of an existing ban record.
 * 1. Create a ban record using the utility function
 * 2. Retrieve the ban record by its ID
 * 3. Validate all fields in the response
 */
export async function test_api_ban_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a ban record
  const createdBan = await generate_random_discussion_board_bans_create(
    connection,
    {},
  );
  typia.assert(createdBan);
  // 2. Retrieve the ban record by its ID
  const retrievedBan = await api.functional.discussionBoard.bans.at(
    connection,
    {
      banId: createdBan.id,
    },
  );
  typia.assert(retrievedBan);
  // 3. Validate the response
  TestValidator.equals("ban id matches", retrievedBan.id, createdBan.id);
  TestValidator.equals(
    "user id matches",
    retrievedBan.user.id,
    createdBan.user.id,
  );
  TestValidator.equals(
    "user displayName matches",
    retrievedBan.user.displayName,
    createdBan.user.displayName,
  );
  TestValidator.equals(
    "user email matches",
    retrievedBan.user.email,
    createdBan.user.email,
  );
  TestValidator.equals(
    "administrator id matches",
    retrievedBan.administrator.id,
    createdBan.administrator.id,
  );
  TestValidator.equals(
    "administrator displayName matches",
    retrievedBan.administrator.displayName,
    createdBan.administrator.displayName,
  );
  TestValidator.equals(
    "reason matches",
    retrievedBan.reason,
    createdBan.reason,
  );
  TestValidator.equals(
    "createdAt matches",
    retrievedBan.createdAt,
    createdBan.createdAt,
  );
}
