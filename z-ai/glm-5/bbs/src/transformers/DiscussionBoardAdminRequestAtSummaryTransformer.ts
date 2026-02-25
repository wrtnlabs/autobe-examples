import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardAdminRequestAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        review_notes: true,
        created_at: true,
        updated_at: true,
        reviewed_at: true,
        requester: DiscussionBoardUserAtSummaryTransformer.select(),
        reviewer: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      review_notes: input.review_notes,
      created_at: input.created_at.toISOString(),
      reviewed_at: input.reviewed_at ? input.reviewed_at.toISOString() : null,
      requester: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.requester,
      ),
      reviewer: input.reviewer
        ? await DiscussionBoardUserAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
    };
  }
}
