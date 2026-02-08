import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_tag_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Test updating an existing tag to ensure it completes and returns a tag object
  const tagId = typia.random<string & tags.Format<"uuid">>();
  const body = typia.random<IDiscussionBoardTag.IUpdate>();
  const output = await api.functional.discussionBoard.tags.update(connection, {
    tagId,
    body,
  });
  typia.assert(output);
}
