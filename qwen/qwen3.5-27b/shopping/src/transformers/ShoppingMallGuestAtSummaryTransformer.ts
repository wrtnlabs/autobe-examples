import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallGuestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        ip: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            expired_at: true,
          },
        } satisfies Prisma.shopping_mall_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallGuest.ISummary> {
    const now = new Date();
    const activeSessions = input.sessions.filter(
      (session) => session.expired_at > now,
    );
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      ip: input.ip,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      active_session_count: activeSessions.length,
    };
  }
}
