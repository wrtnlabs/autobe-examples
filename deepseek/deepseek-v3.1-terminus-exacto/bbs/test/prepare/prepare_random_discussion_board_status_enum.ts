import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_status_enum(
  input?: DeepPartial<IDiscussionBoardStatusEnum.ICreate> | undefined,
): IDiscussionBoardStatusEnum.ICreate {
  const entityTypes = [
    "article",
    "comment",
    "admin_request",
    "user",
    "ban",
    "attachment",
  ] as const;
  const statusValues = [
    "pending",
    "approved",
    "rejected",
    "draft",
    "published",
    "active",
    "inactive",
    "banned",
    "archived",
  ] as const;
  return {
    entity_type: input?.entity_type ?? RandomGenerator.pick(entityTypes),
    value: input?.value ?? RandomGenerator.pick(statusValues),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 3,
      }),
    sort_order:
      input?.sort_order ??
      (Math.random() < 0.7
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>
          >()
        : undefined),
  };
}
