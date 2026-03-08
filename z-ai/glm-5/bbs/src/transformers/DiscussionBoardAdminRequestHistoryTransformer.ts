import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "./DiscussionBoardAdminRequestAtSummaryTransformer";

export namespace DiscussionBoardAdminRequestHistoryTransformer {
  export type Payload =
    Prisma.discussion_board_admin_request_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        adminRequest: DiscussionBoardAdminRequestAtSummaryTransformer.select(),
        reviewer: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_request_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminRequestHistory> {
    return {
      id: input.id,
      status: input.status as "pending" | "approved" | "rejected",
      adminRequest:
        await DiscussionBoardAdminRequestAtSummaryTransformer.transform(
          input.adminRequest,
        ),
      reviewer:
        input.reviewer !== null
          ? await DiscussionBoardAdminAtSummaryTransformer.transform(
              input.reviewer,
            )
          : null,
      created_at: input.created_at.toISOString(),
    };
  }
}
