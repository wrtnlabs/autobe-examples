import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleFileDisplayInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFileDisplayInfo";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleFileAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_type: true,
        file_size: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: true,
      },
    } satisfies Prisma.discussion_board_article_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleFile.ISummary> {
    return {
      id: input.id,
      file_type: input.file_type as "PDF" | "DOCX" | "XLSX",
      file_size: Number(input.file_size),
      display_info: {
        icon:
          input.file_type === "PDF"
            ? "pdf-icon"
            : input.file_type === "DOCX"
              ? "docx-icon"
              : "xlsx-icon",
        size: formatFileSize(input.file_size),
      },
    };
  }
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
