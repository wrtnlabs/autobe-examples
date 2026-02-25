import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAuditLogAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        action_type: true,
        action_subtype: true,
        description: true,
        ip_address: true,
        user_agent: true,
        metadata: true,
        success: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        actor: {
          select: { id: true },
        } satisfies Prisma.discussion_board_usersFindManyArgs,
        targetUser: {
          select: { id: true },
        } satisfies Prisma.discussion_board_usersFindManyArgs,
        targetAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        targetSuperAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_super_adminsFindManyArgs,
        targetArticle: {
          select: { id: true },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        targetComment: {
          select: { id: true },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        targetSection: {
          select: { id: true },
        } satisfies Prisma.discussion_board_sectionsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_subtype: input.action_subtype ?? undefined,
      description: input.description,
      success: input.success,
      created_at: input.created_at.toISOString(),
      actor_type: input.actor_type,
      target_user_id: input.targetUser?.id ?? null,
      target_admin_id: input.targetAdmin?.id ?? null,
      target_super_admin_id: input.targetSuperAdmin?.id ?? null,
      target_article_id: input.targetArticle?.id ?? null,
      target_comment_id: input.targetComment?.id ?? null,
      target_section_id: input.targetSection?.id ?? null,
    };
  }
}
