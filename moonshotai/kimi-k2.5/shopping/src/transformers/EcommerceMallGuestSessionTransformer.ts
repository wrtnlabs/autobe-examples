import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallGuestSessionTransformer {
  export type Payload = Prisma.ecommerce_mall_guest_sessionsGetPayload<
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
        ecommerceMallGuest: {
          select: {
            id: true,
            created_at: true,
            sessions: {
              select: {
                expired_at: true,
              },
              orderBy: {
                expired_at: "desc" as const,
              },
              take: 1,
            } satisfies Prisma.ecommerce_mall_guest_sessionsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_guestsDefaultArgs,
      },
    } satisfies Prisma.ecommerce_mall_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallGuestSession> {
    const expiresAt =
      input.ecommerceMallGuest.sessions[0]?.expired_at ??
      input.ecommerceMallGuest.created_at;
    const now = new Date();
    const isActive = expiresAt > now;
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      guest: {
        id: input.ecommerceMallGuest.id,
        createdAt: input.ecommerceMallGuest.created_at.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: isActive ? "active" : "expired",
      } satisfies IEcommerceMallGuest.ISummary,
    };
  }
}
