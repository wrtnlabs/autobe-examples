import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardUserSessionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_user_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        user_agent: true,
        referrer: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        created_at: true,
        expired_at: true,
        last_accessed_at: true,
      },
    } satisfies Prisma.discussion_board_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUserSession.ISummary> {
    return {
      id: input.id,
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      last_accessed_at: input.last_accessed_at.toISOString(),
    };
  }
}
