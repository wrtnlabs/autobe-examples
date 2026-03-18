import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformGuestSessionTransformer {
  export type Payload = Prisma.hrm_platform_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        guest: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformGuestSession> {
    return {
      id: input.id,
      guest_id: input.guest.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}
