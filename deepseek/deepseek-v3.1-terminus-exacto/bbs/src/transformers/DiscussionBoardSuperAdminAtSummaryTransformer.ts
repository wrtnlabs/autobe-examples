import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuperAdminAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_super_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        admin_grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        systemNotifications: true,
        superAdminArticleViewStats: true,
        superAdminCommentDeletions: true,
        commentActivities: true,
        adminRequestDecisions: true,
        administratorAssignmentReceipts: true,
        assignmentsMades: true,
        attachmentDownloads: true,
      },
    } satisfies Prisma.discussion_board_super_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuperAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      admin_grade: input.admin_grade,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
