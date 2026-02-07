import { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_section_image(
  input?: DeepPartial<IDiscussionBoardSectionImage.ICreate>,
): IDiscussionBoardSectionImage.ICreate {
  return {
    filename: input?.filename ?? RandomGenerator.alphabets(10) + ".png",
    mime_type:
      input?.mime_type ??
      RandomGenerator.pick(["image/png", "image/jpeg", "image/gif"]),
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10485760>
      >(),
    width:
      input?.width ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3840>
      >(),
    height:
      input?.height ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2160>
      >(),
    image_type:
      input?.image_type ??
      RandomGenerator.pick([
        "banner",
        "icon",
        "promotional",
        "thumbnail",
      ] as const),
    storage_path:
      input?.storage_path ??
      "/uploads/sections/" + RandomGenerator.alphabets(8) + ".png",
    alt_text: input?.alt_text ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}