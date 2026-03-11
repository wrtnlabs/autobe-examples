import { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_status_enum_snapshot(
  input?: DeepPartial<IDiscussionBoardStatusEnumSnapshot.ICreate>,
): IDiscussionBoardStatusEnumSnapshot.ICreate {
  return {
    snapshotName:
      input?.snapshotName ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    snapshotReason:
      input?.snapshotReason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
  };
}
