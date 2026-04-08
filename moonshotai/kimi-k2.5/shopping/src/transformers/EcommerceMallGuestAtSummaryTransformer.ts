import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallGuestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
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
    } satisfies Prisma.ecommerce_mall_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallGuest.ISummary> {
    const expiresAt = input.sessions[0]?.expired_at ?? input.created_at;
    const now = new Date();
    const isActive = expiresAt > now;
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: isActive ? "active" : "expired",
    };
  }
}
