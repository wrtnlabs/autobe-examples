import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArchive";
import { prepare_random_discussion_board_archive } from "../prepare/prepare_random_discussion_board_archive";
export async function generate_random_discussion_board_moderator_archives_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArchive.ICreate>;
  },
): Promise<IDiscussionBoardArchive> {
  const prepared: IDiscussionBoardArchive.ICreate =
    prepare_random_discussion_board_archive(props.body);
  const result: IDiscussionBoardArchive =
    await api.functional.discussionBoard.moderator.archives.create(connection, {
      body: prepared,
    });
  return result;
}
