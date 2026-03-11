import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_snapshot(
  input?: DeepPartial<IDiscussionBoardArticleSnapshot.ICreate>,
): IDiscussionBoardArticleSnapshot.ICreate {
  return {
    discussion_board_article_id:
      input?.discussion_board_article_id ??
      typia.random<string & tags.Format<"uuid">>(),
    snapshot_reason:
      input?.snapshot_reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
