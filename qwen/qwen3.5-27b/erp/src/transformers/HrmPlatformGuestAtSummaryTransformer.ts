import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformGuestAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_guestsGetPayload<
    ReturnType<typeof select>
  >;
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
    } satisfies Prisma.hrm_platform_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformGuest.ISummary> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
