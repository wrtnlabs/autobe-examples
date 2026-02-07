import { IEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardSectionDeletionTransformer {
  export type Payload = Prisma.economic_board_section_deletionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        section: { select: { id: true } },
        administrator: { select: { id: true } },
      },
    } satisfies Prisma.economic_board_section_deletionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardSectionDeletion> {
    return {
      section_id: input.section.id,
      administrator_id: input.administrator.id,
      created_at: input.created_at.toISOString(),
    };
  }
}
