import { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicDiscussionCitizenAtSummaryTransformer } from "./EconomicDiscussionCitizenAtSummaryTransformer";

export namespace EconomicDiscussionBanTransformer {
  export type Payload = Prisma.economic_discussion_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: EconomicDiscussionCitizenAtSummaryTransformer.select(),
        admin: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.economic_discussion_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionBan> {
    return {
      ban_id: input.id,
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      affected_user:
        await EconomicDiscussionCitizenAtSummaryTransformer.transform(
          input.citizen,
        ),
      issuing_admin: {
        id: input.admin.id,
      },
    };
  }
}
