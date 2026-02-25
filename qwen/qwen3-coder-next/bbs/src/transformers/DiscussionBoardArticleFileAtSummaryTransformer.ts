import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleFileAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.discussion_board_article_filesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        original_filename: true,
        file_path: true,
        mime_type: true,
        file_size: true,
        article: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_article_filesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleFile.ISummary> {
    return {
      id: input.id,
      original_filename: input.original_filename,
      file_path: input.file_path,
      mime_type: input.mime_type,
      file_size: input.file_size,
      article_id: input.article.id,
    };
  }
}
