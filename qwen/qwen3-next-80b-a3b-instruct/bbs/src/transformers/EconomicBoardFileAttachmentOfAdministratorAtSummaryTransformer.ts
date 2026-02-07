import { IEconomicBoardFileAttachmentOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardFileAttachmentOfAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardFileAttachmentOfAdministratorAtSummaryTransformer {
  export type Payload = Prisma.economic_board_file_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_name: true,
        file_size: true,
        mime_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        actor: true,
      },
    } satisfies Prisma.economic_board_file_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardFileAttachmentOfAdministrator.ISummary> {
    return {
      id: input.id,
      file_name: input.file_name,
      file_size: input.file_size,
      mime_type: input.mime_type,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
