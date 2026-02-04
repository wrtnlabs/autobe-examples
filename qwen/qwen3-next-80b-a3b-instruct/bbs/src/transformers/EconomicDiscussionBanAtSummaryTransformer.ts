import { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicDiscussionBanAtSummaryTransformer {
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
        citizen: true,
        admin: true,
      },
    } satisfies Prisma.economic_discussion_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionBan.ISummary> {
    return {
      banned_user_id: input.citizen.id,
      banned_by_admin_id: input.admin.id,
      reason: input.reason,
      banned_at: toISOStringSafe(input.created_at),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
