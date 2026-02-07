import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardModerationLogTransformer {
  export type Payload = Prisma.discussion_board_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        action_description: true,
        ip_address: true,
        user_agent: true,
        performed_at: true,
        scheduled_at: true,
        completed_at: true,
        status: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
        targetArticle: DiscussionBoardArticleAtSummaryTransformer.select(),
        targetComment: DiscussionBoardCommentAtSummaryTransformer.select(),
        targetUser: DiscussionBoardUserAtSummaryTransformer.select(),
        targetSection: DiscussionBoardSectionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_description: input.action_description,
      ip_address: input.ip_address,
      user_agent: input.user_agent ?? null,
      performed_at: input.performed_at.toISOString(),
      scheduled_at: input.scheduled_at?.toISOString() ?? null,
      completed_at: input.completed_at?.toISOString() ?? null,
      status: input.status,
      error_message: input.error_message ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : null,
      superAdmin: input.superAdmin
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.superAdmin,
          )
        : null,
      targetArticle: input.targetArticle
        ? await DiscussionBoardArticleAtSummaryTransformer.transform(
            input.targetArticle,
          )
        : null,
      targetComment: input.targetComment
        ? await DiscussionBoardCommentAtSummaryTransformer.transform(
            input.targetComment,
          )
        : null,
      targetUser: input.targetUser
        ? await DiscussionBoardUserAtSummaryTransformer.transform(
            input.targetUser,
          )
        : null,
      targetSection: input.targetSection
        ? await DiscussionBoardSectionAtSummaryTransformer.transform(
            input.targetSection,
          )
        : null,
    };
  }
}
