import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThumbnail";
export function prepare_random_discussion_board_thumbnail(
  input?: DeepPartial<IDiscussionBoardThumbnail.ICreate>,
): IDiscussionBoardThumbnail.ICreate {
  return {
    article_id:
      input?.article_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
