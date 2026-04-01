import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { IMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoGuestAtSummaryTransformer } from "./MultiUserTodoGuestAtSummaryTransformer";

export namespace MultiUserTodoGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_guest_sessionsGetPayload<
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
        guest: MultiUserTodoGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoGuestSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      guest: await MultiUserTodoGuestAtSummaryTransformer.transform(
        input.guest,
      ),
    };
  }
}
