import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_status_type(
  input?: DeepPartial<IDiscussionBoardStatusType.ICreate> | undefined,
): IDiscussionBoardStatusType.ICreate {
  return {
    category:
      input?.category ??
      RandomGenerator.pick([
        "article",
        "comment",
        "admin_request",
        "user_account",
        "ban",
      ] as const),
    code:
      input?.code ??
      RandomGenerator.pick([
        "pending",
        "approved",
        "rejected",
        "draft",
        "published",
        "active",
        "inactive",
        "banned",
        "expired",
      ] as const),
    display_name:
      input?.display_name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    description:
      input?.description ??
      (Math.random() > 0.5
        ? RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 3,
          })
        : null),
    display_order:
      input?.display_order ?? typia.random<number & tags.Type<"int32">>(),
    is_active: input?.is_active ?? true,
  };
}
