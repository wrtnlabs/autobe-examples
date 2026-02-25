import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEconomicBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicBoardAdministratorAtSummaryTransformer } from "./EconomicBoardAdministratorAtSummaryTransformer";

export namespace EconomicBoardSectionSnapshotTransformer {
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
        section: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.economic_board_sectionsFindManyArgs,
        administrator: EconomicBoardAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_board_section_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardSectionSnapshot> {
    return {
      id: input.id,
      section_name: input.section_name,
      section_description: input.section_description,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      snapshot_reason: input.snapshot_reason,
      section: {
        id: input.section.id,
        name: input.section.name,
        description: input.section.description,
        created_at: toISOStringSafe(input.section.created_at),
        updated_at: toISOStringSafe(input.section.updated_at),
      },
      administrator: input.administrator
        ? await EconomicBoardAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : null,
      deleted_at: null,
      economic_board_section_id: null,
      economic_board_administrator_id: null,
    };
  }
}
