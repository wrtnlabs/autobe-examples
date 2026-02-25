import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardSuperAdminTransformer } from "./DiscussionBoardSuperAdminTransformer";

export namespace DiscussionBoardModeratedContentHistoryAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        action_description: true,
        performed_at: true,
        status: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminTransformer.select(),
      },
    } satisfies Prisma.discussion_board_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModeratedContentHistory.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_description: input.action_description,
      performed_at: toISOStringSafe(input.performed_at),
      status: input.status,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : null,
      super_admin: input.superAdmin
        ? await DiscussionBoardSuperAdminTransformer.transform(input.superAdmin)
        : null,
    };
  }
}
