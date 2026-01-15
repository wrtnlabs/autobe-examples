import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
export function prepare_random_discussion_board_article_file(
  input?: DeepPartial<IDiscussionBoardArticleFile.ICreate>,
): IDiscussionBoardArticleFile.ICreate {
  return {
    article_id:
      input?.article_id ?? typia.random<string & tags.Format<"uuid">>(),
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 10,
      }).substring(0, 255),
    extension:
      input?.extension ??
      RandomGenerator.pick([
        "jpg",
        "jpeg",
        "png",
        "gif",
        "pdf",
        "mp4",
        "txt",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "zip",
      ] as const),
    url:
      input?.url ??
      `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(32)}.${input?.extension ?? RandomGenerator.pick(["jpg", "jpeg", "png", "gif", "pdf", "mp4", "txt", "doc", "docx", "xls", "xlsx", "zip"] as const)}`,
    uploaded_by: typia.random<string & tags.Format<"uuid">>(),
    uploaded_at: new Date().toISOString(),
  };
}
