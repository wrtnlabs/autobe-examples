import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorRequestAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        submitted_at: true,
        processed_at: true,
        rejection_reason: true,
        submitter: true,
        processor: true,
      },
    } satisfies Prisma.discussion_board_administrator_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorRequest.ISummary> {
    return {
      status: input.status,
      submitted_at: input.submitted_at.toISOString(),
      rejection_reason: input.rejection_reason ?? null,
    };
  }
}
