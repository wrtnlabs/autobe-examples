import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuperAdminSessionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_super_admin_sessionsGetPayload<
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
        superAdmin: true,
        notificationAssociations: true,
        superAdminSessionArticleViewStats: true,
        superAdminCommentDeletions: true,
        commentActivitiesThroughSessions: true,
        assignmentActions: true,
        attachmentDownloadReferences: true,
      },
    } satisfies Prisma.discussion_board_super_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuperAdminSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}
