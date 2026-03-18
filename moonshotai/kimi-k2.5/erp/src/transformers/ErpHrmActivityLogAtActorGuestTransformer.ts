import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmActivityLogAtActorGuestTransformer {
  export type Payload = Prisma.erp_hrm_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
      },
    } satisfies Prisma.erp_hrm_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmActivityLog.IActorGuest> {
    return {
      type: "guest",
      id: input.id,
      deviceFingerprint: input.device_fingerprint,
    };
  }
}
