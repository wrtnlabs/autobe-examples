import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicForumAttachmentFileTransformer {
  export type Payload = Prisma.economic_forum_attachment_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        hashed_filename: true,
        original_filename: true,
        mime_type: true,
        size: true,
        created_at: true,
      },
    } satisfies Prisma.economic_forum_attachment_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicForumAttachmentFile> {
    return {
      id: input.id,
    };
  }
}
