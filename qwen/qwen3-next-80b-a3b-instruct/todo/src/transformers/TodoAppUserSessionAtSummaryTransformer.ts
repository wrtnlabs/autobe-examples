import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserSessionAtSummaryTransformer {
  export type Payload = Prisma.todo_app_user_sessionsGetPayload<
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
        user: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserSession.ISummary> {
    return {
      ipAddress: input.ip,
      userAgent: "Mozilla/5.0 (compatible; AutoBE Agent)",
      createdAt: input.created_at.toISOString(),
      expiresAt: input.expired_at.toISOString(),
      status: "active",
      userId: input.user.id,
    };
  }
}
