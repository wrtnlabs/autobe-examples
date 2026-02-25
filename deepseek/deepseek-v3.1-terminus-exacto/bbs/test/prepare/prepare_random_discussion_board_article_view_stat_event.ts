import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_view_stat_event(
  input?: DeepPartial<IDiscussionBoardArticleViewStatEvent.ICreate>,
): IDiscussionBoardArticleViewStatEvent.ICreate {
  return {
    view_duration_seconds:
      input?.view_duration_seconds ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<3600>
      >(),
    discussion_board_user_session_id:
      input?.discussion_board_user_session_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
