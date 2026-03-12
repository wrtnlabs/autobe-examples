import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

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
        submitted_at: true,
        reviewed_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        reviewingAdministrator:
          DiscussionBoardAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminRequest.ISummary> {
    return {
      id: input.id,
      member: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
      reviewingAdministrator: input.reviewingAdministrator
        ? await DiscussionBoardAdministratorAtSummaryTransformer.transform(
            input.reviewingAdministrator,
          )
        : null,
      reason: input.reason,
      status: input.status,
      submitted_at: input.submitted_at.toISOString(),
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
    };
  }
}
