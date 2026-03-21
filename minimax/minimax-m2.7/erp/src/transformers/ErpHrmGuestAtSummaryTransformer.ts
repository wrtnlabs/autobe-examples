import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmGuestAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_identifier: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmGuest.ISummary> {
    return {
      id: input.id,
      device_identifier: input.device_identifier,
      created_at: input.created_at.toISOString(),
      sessions_count:
        input.sessions.length > 0
          ? (input.sessions.length as number & {
              __TYPE__: "int32";
            })
          : undefined,
    };
  }
}
