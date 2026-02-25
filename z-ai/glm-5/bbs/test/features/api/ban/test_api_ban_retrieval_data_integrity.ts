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

export async function test_api_ban_retrieval_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Prepare specific test data with detailed reason text
  const detailedReason =
    "This user has repeatedly violated community guidelines by posting inflammatory political content and engaging in personal attacks against other members. Despite multiple warnings, the behavior continued unabated.";
  // Create a ban record using the utility function
  const createdBan = await generate_random_discussion_board_bans_create(
    connection,
    {
      body: {
        reason: detailedReason,
      },
    },
  );
  typia.assert(createdBan);
  // Retrieve the same ban record using the GET endpoint
  const retrievedBan = await api.functional.discussionBoard.bans.at(
    connection,
    {
      banId: createdBan.id,
    },
  );
  typia.assert(retrievedBan);
  // Validate data integrity between creation and retrieval
  TestValidator.equals("ban ID matches", retrievedBan.id, createdBan.id);
  TestValidator.equals(
    "user ID matches",
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
    "reason text preserved exactly",
    retrievedBan.reason,
    detailedReason,
  );
  TestValidator.equals(
    "createdAt timestamp matches",
    retrievedBan.createdAt,
    createdBan.createdAt,
  );
  TestValidator.equals(
    "administrator ID matches",
    retrievedBan.administrator.id,
    createdBan.administrator.id,
  );
  TestValidator.equals(
    "administrator displayName matches",
    retrievedBan.administrator.displayName,
    createdBan.administrator.displayName,
  );
}
