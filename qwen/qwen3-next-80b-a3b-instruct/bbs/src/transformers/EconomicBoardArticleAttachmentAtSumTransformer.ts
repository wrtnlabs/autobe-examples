import { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardArticleAttachmentAtSumTransformer {
  export type Payload = Prisma.economic_board_article_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_url: true,
        file_name: true,
        file_type: true,
        file_size: true,
        created_at: true,
        updated_at: true,
        article: true,
        snapshotAttachments: true,
      },
    } satisfies Prisma.economic_board_article_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardArticleAttachment.ISum> {
    return {
      id: input.id,
      file_url: input.file_url,
      file_name: input.file_name,
      file_type: input.file_type,
      file_size: input.file_size,
      created_at: input.created_at.toISOString(),
    };
  }
}
