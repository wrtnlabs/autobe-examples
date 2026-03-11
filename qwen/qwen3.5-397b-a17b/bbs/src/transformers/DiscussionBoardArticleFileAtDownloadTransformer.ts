import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleFileAtDownloadTransformer {
  export type Payload = Prisma.discussion_board_article_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        original_name: true,
        mime_type: true,
        size: true,
        path: true,
      },
    } satisfies Prisma.discussion_board_article_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleFile.IDownload> {
    return {
      uri: input.path,
      originalName: input.original_name,
      mimeType: input.mime_type,
      size: input.size,
    };
  }
}
