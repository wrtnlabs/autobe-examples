import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCommentReply";
export function prepare_random_discussion_board_article_comment_reply(
  input?: DeepPartial<IDiscussionBoardArticleCommentReply.ICreate>,
): IDiscussionBoardArticleCommentReply.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      }),
    parent_comment_id:
      input?.parent_comment_id ?? typia.random<string & tags.Format<"uuid">>(),
    citizen_id:
      input?.citizen_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
