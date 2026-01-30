import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsCommentModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentModerationAction";
export function prepare_random_community_bbs_comment_moderation_action(
  input?: DeepPartial<ICommunityBbsCommentModerationAction.ICreate> | undefined,
): ICommunityBbsCommentModerationAction.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<20>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
