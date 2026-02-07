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

export namespace DiscussionBoardModerationLogAtSummaryTransformer {
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
  ): Promise<IDiscussionBoardModerationLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_description: input.action_description,
      performed_at: input.performed_at.toISOString(),
      status: input.status,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : undefined,
      superAdmin: input.superAdmin
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.superAdmin,
          )
        : undefined,
      targetArticle: input.targetArticle
        ? await DiscussionBoardArticleAtSummaryTransformer.transform(
            input.targetArticle,
          )
        : undefined,
      targetComment: input.targetComment
        ? await DiscussionBoardCommentAtSummaryTransformer.transform(
            input.targetComment,
          )
        : undefined,
      targetUser: input.targetUser
        ? await DiscussionBoardUserAtSummaryTransformer.transform(
            input.targetUser,
          )
        : undefined,
      targetSection: input.targetSection
        ? await DiscussionBoardSectionAtSummaryTransformer.transform(
            input.targetSection,
          )
        : undefined,
    };
  }
}
