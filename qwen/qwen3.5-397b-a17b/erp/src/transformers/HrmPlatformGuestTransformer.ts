import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformGuestSessionTransformer } from "./HrmPlatformGuestSessionTransformer";

export namespace HrmPlatformGuestTransformer {
  export type Payload = Prisma.hrm_platform_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: HrmPlatformGuestSessionTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformGuest> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        HrmPlatformGuestSessionTransformer.transform,
      ),
    };
  }
}
