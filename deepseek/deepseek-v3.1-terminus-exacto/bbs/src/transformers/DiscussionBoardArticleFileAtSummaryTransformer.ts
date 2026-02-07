import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleFileAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_name: true,
        file_type: true,
        file_size: true,
        storage_path: true,
        uploaded_by: true,
        description: true,
        download_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: { select: { id: true } },
      },
    } satisfies Prisma.discussion_board_article_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleFile.ISummary> {
    return {
      id: input.id,
      file_name: input.file_name,
      file_type: input.file_type,
      file_size: input.file_size,
      download_count: input.download_count,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
