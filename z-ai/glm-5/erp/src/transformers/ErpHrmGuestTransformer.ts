import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmGuestSessionAtSummaryTransformer } from "./ErpHrmGuestSessionAtSummaryTransformer";

export namespace ErpHrmGuestTransformer {
  export type Payload = Prisma.erp_hrm_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: ErpHrmGuestSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmGuest> {
    return {
      id: input.id,
      fingerprint: input.fingerprint,
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        ErpHrmGuestSessionAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
