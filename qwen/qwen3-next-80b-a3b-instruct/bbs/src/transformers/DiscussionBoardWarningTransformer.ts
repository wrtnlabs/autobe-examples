import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardWarningTransformer {
  export type Payload = Prisma.discussion_board_warningsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        warning_count: true,
        severity: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_warningsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardWarning> {
    return {
      reason: input.reason,
      level:
        input.severity === "none"
          ? "none"
          : input.severity === "moderate"
            ? "moderate"
            : "severe",
      context: input.context ?? undefined,
    };
  }
}
