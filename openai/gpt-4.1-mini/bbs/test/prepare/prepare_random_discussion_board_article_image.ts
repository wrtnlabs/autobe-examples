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
    imageUrl: input?.imageUrl ?? typia.random<string & tags.Format<"url">>(),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder:
      input?.displayOrder ?? typia.random<number & tags.Type<"int32">>(),
  };
}
