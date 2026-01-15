import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThumbnail";
import { prepare_random_discussion_board_thumbnail } from "../prepare/prepare_random_discussion_board_thumbnail";
export async function generate_random_discussion_board_moderator_thumbnails_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardThumbnail.ICreate>;
  },
): Promise<IDiscussionBoardThumbnail> {
  const prepared: IDiscussionBoardThumbnail.ICreate =
    prepare_random_discussion_board_thumbnail(props.body);
  return await api.functional.discussionBoard.moderator.thumbnails.create(
    connection,
    {
      body: prepared,
    },
  );
}
