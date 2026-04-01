import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsGuestAtSummaryTransformer {
  export type Payload = Prisma.hrms_guestsGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
      },
    } satisfies Prisma.hrms_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsGuest.ISummary> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      ip_address: input.ip_address ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
