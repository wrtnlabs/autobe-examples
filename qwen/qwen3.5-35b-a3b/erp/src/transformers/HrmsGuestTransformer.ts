import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsGuestTransformer {
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
      },
    } satisfies Prisma.hrms_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsGuest> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      ip_address: input.ip_address ?? undefined,
      user_agent: input.user_agent ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmsGuest;
  }
}
