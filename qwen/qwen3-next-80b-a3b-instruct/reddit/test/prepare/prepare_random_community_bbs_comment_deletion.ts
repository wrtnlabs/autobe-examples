import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentDeletion";
export function prepare_random_community_bbs_comment_deletion(
  input?: DeepPartial<ICommunityBbsCommentDeletion.ICreate>,
): ICommunityBbsCommentDeletion.ICreate {
  return {
    commentId: input?.commentId ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<10>
        >(),
      }),
  };
}
