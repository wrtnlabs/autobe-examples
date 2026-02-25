import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardRegisteredUserAtSummaryTransformer } from "./DiscussionBoardRegisteredUserAtSummaryTransformer";

export namespace DiscussionBoardRegisteredUserSessionAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_registered_user_sessionsGetPayload<
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
        registered_user_id: true,
        registeredUser:
          DiscussionBoardRegisteredUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_registered_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardRegisteredUserSession.ISummary> {
    return {
      id: input.id,
      registeredUser:
        await DiscussionBoardRegisteredUserAtSummaryTransformer.transform(
          input.registeredUser,
        ),
      registered_user_id: input.registered_user_id,
      ip: input.ip,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString() ?? null,
    };
  }
}
