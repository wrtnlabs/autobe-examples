import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_attachment(
  input?: DeepPartial<IDiscussionBoardArticleAttachment.ICreate>,
): IDiscussionBoardArticleAttachment.ICreate {
  const type = input?.type ?? RandomGenerator.pick(["file", "image"] as const);
  const extension =
    input?.extension ??
    RandomGenerator.pick(
      type === "file"
        ? (["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"] as const)
        : (["jpg", "png", "gif", "webp"] as const),
    );
  const maxSize = type === "file" ? 20971520 : 10485760; // 20MB for files, 10MB for images
  return {
    type,
    name: input?.name ?? `${RandomGenerator.name(2)}.${extension}`,
    extension,
    size:
      input?.size ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<1024> &
          tags.Maximum<20971520>
      >(),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
