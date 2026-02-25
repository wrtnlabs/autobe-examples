import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article(
  input?: DeepPartial<IDiscussionBoardArticle.ICreate>,
): IDiscussionBoardArticle.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 5,
        sentenceMax: 15,
      }),
    sectionId: input?.sectionId ?? typia.random<string & tags.Format<"uuid">>(),
    files: input?.files
      ? input.files.map((file) => ({
          original_filename:
            file.original_filename ?? RandomGenerator.name(2) + ".pdf",
          storage_path:
            file.storage_path ?? typia.random<string & tags.Format<"uri">>(),
          file_size:
            file.file_size ??
            typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1024> &
                tags.Maximum<10485760>
            >(),
          mime_type:
            file.mime_type ??
            RandomGenerator.pick([
              "application/pdf",
              "application/msword",
              "text/plain",
              "application/zip",
            ] as const),
        }))
      : undefined,
    images: input?.images
      ? input.images.map((img) => ({
          original_filename:
            img.original_filename ?? RandomGenerator.name(1) + ".jpg",
          storage_path:
            img.storage_path ?? typia.random<string & tags.Format<"uri">>(),
          file_size:
            img.file_size ??
            typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1024> &
                tags.Maximum<5242880>
            >(),
          mime_type:
            img.mime_type ??
            RandomGenerator.pick([
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
            ] as const),
          width:
            img.width ??
            typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<2000>
            >(),
          height:
            img.height ??
            typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<2000>
            >(),
        }))
      : undefined,
    tags: input?.tags
      ? input.tags.map(
          (tag) => tag ?? RandomGenerator.alphaNumeric(8).toLowerCase(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => RandomGenerator.alphaNumeric(8).toLowerCase(),
        ),
  };
}
