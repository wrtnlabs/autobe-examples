import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomyPoliticsBoardSectionAtSummaryTransformer {
  export type Payload = Prisma.economy_politics_board_sectionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.economy_politics_board_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardSection.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
