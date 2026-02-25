import { IEconomicBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardSectionSnapshotAtSummaryTransformer {
  export type Payload = Prisma.economic_board_section_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        section_name: true,
        section_description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshot_reason: true,
        section: true,
        administrator: {
          select: { id: true },
        },
      },
    } satisfies Prisma.economic_board_section_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardSectionSnapshot.ISummary> {
    return {
      id: input.id,
      section_name: input.section_name,
      section_description: input.section_description,
      created_at: input.created_at.toISOString(),
      snapshot_reason: input.snapshot_reason,
      administrator_id: input.administrator?.id ?? null,
    };
  }
}
