import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_section_file(
  input?: DeepPartial<IDiscussionBoardSectionFile.ICreate>,
): IDiscussionBoardSectionFile.ICreate {
  return {
    filename: input?.filename ?? RandomGenerator.alphabets(10) + ".txt",
    file_type:
      input?.file_type ??
      RandomGenerator.pick([
        "text/plain",
        "application/pdf",
        "image/jpeg",
        "application/vnd.ms-excel",
      ] as const),
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10485760>
      >(),
    file_path:
      input?.file_path ??
      "/uploads/" +
        RandomGenerator.alphabets(8) +
        "/" +
        RandomGenerator.alphabets(12) +
        ".dat",
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
