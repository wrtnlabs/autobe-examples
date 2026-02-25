import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardHealthCheckAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_health_checksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        checked_at: true,
        details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_health_checksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardHealthCheck.ISummary> {
    return {
      id: input.id,
      status: input.status,
      checkedAt: input.checked_at.toISOString(),
      details: input.details ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
