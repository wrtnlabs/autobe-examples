import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_image(
  input?: DeepPartial<IDiscussionBoardArticleImage.ICreate>,
): IDiscussionBoardArticleImage.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphabets(8) +
        "." +
        RandomGenerator.pick(["jpg", "png", "gif", "webp"] as const),
    size:
      input?.size ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<1024> &
          tags.Maximum<10485760>
      >(),
    type:
      input?.type ??
      RandomGenerator.pick([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ] as const),
    url: input?.url ?? typia.random<string & tags.Format<"url">>(),
    width:
      input?.width ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4096>
      >(),
    height:
      input?.height ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4096>
      >(),
  };
}
