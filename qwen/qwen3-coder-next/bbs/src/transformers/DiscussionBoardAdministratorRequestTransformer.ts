import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardAdministratorRequestTransformer {
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
        submitter: DiscussionBoardMemberAtSummaryTransformer.select(),
        processor: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrator_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      submitted_at: input.submitted_at.toISOString(),
      processed_at: input.processed_at?.toISOString() ?? null,
      rejection_reason: input.rejection_reason ?? null,
      submitter: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.submitter,
      ),
      processor: input.processor
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.processor,
          )
        : null,
    };
  }
}
