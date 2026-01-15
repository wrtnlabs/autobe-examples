import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
export function prepare_random_discussion_board_article_image(
  input?: DeepPartial<IDiscussionBoardArticleImage.ICreate>,
): IDiscussionBoardArticleImage.ICreate {
  return {
    filename:
      input?.filename ??
      `${RandomGenerator.alphabets(5)}.${RandomGenerator.pick(["jpg", "png", "gif"] as const)}`,
    mimetype:
      input?.mimetype ??
      RandomGenerator.pick(["image/jpeg", "image/png", "image/gif"] as const),
    size:
      input?.size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
      >(),
  };
}
