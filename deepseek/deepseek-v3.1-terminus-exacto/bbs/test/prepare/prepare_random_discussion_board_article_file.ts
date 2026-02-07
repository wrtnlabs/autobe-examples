import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_file(
  input?: DeepPartial<IDiscussionBoardArticleFile.ICreate>,
): IDiscussionBoardArticleFile.ICreate {
  // Generate realistic filename with common extensions
  const fileName =
    input?.file_name ??
    (() => {
      const extensions = ["pdf", "docx", "jpg", "png", "txt", "zip", "mp4"];
      const baseName = RandomGenerator.alphabets(8);
      const ext = RandomGenerator.pick(extensions as readonly string[]);
      return `${baseName}.${ext}`;
    })();
  // Generate MIME type independently
  const fileType =
    input?.file_type ??
    (() => {
      const mimeTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "text/plain",
        "application/zip",
        "video/mp4",
      ];
      return RandomGenerator.pick(mimeTypes as readonly string[]);
    })();
  return {
    file_name: fileName,
    file_type: fileType,
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10485760>
      >(), // 100 bytes to 10MB
    storage_path:
      input?.storage_path ??
      `/uploads/${RandomGenerator.alphabets(16)}/${fileName}`,
    description:
      input?.description ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 2 })
        : undefined),
  };
}
