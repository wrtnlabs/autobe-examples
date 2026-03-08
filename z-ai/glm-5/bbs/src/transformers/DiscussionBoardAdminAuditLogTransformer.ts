import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "./DiscussionBoardAdminRequestAtSummaryTransformer";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

export namespace DiscussionBoardAdminAuditLogTransformer {
  export type Payload = Prisma.discussion_board_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        reason: true,
        ip: true,
        created_at: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        comment: DiscussionBoardCommentAtSummaryTransformer.select(),
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        adminRequest: DiscussionBoardAdminRequestAtSummaryTransformer.select(),
        targetAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminAuditLog> {
    return {
      id: input.id,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : null,
      member: input.member
        ? await DiscussionBoardMemberAtSummaryTransformer.transform(
            input.member,
          )
        : null,
      article: input.article
        ? await DiscussionBoardArticleAtSummaryTransformer.transform(
            input.article,
          )
        : null,
      comment: input.comment
        ? await DiscussionBoardCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : null,
      section: input.section
        ? await DiscussionBoardSectionAtSummaryTransformer.transform(
            input.section,
          )
        : null,
      adminRequest: input.adminRequest
        ? await DiscussionBoardAdminRequestAtSummaryTransformer.transform(
            input.adminRequest,
          )
        : null,
      targetAdmin: input.targetAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.targetAdmin,
          )
        : null,
      action: input.action,
      reason: input.reason ?? null,
      ip: input.ip,
      created_at: input.created_at.toISOString(),
    };
  }
}
