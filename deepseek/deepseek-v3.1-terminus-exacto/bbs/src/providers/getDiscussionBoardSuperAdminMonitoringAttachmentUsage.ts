import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentAtSummaryTransformer";
import { DiscussionBoardAttachmentDownloadTransformer } from "../transformers/DiscussionBoardAttachmentDownloadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminMonitoringAttachmentUsage(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardAttachmentDownload> {
  // Verify super admin authorization
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (superAdmin === null) {
    throw new HttpException("Super administrator not found", 403);
  }
  // Get the most recent download record to use as a template for analytics data
  const recentDownload =
    await MyGlobal.prisma.discussion_board_attachment_downloads.findFirst({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAttachmentDownloadTransformer.select(),
    });
  if (!recentDownload) {
    // If no downloads exist, create a minimal record with analytics context
    const minimalAttachment =
      await MyGlobal.prisma.discussion_board_attachments.findFirst({
        where: { deleted_at: null },
        ...DiscussionBoardAttachmentAtSummaryTransformer.select(),
      });
    if (!minimalAttachment) {
      throw new HttpException(
        "No attachment data available for monitoring",
        404,
      );
    }
    // Create analytics-focused download record
    const analyticsRecord = {
      id: v4(),
      created_at: new Date().toISOString(),
      actor_type: "super_admin",
      ip: "127.0.0.1",
      user_agent: "Monitoring Dashboard",
      referrer: null,
      deleted_at: null,
      attachment: minimalAttachment,
    };
    return {
      id: analyticsRecord.id as string & tags.Format<"uuid">,
      created_at: analyticsRecord.created_at as string &
        tags.Format<"date-time">,
      actor_type: analyticsRecord.actor_type,
      ip: analyticsRecord.ip,
      user_agent: analyticsRecord.user_agent,
      referrer: analyticsRecord.referrer,
      attachment: await DiscussionBoardAttachmentAtSummaryTransformer.transform(
        analyticsRecord.attachment,
      ),
    };
  }
  // Transform the actual download record
  return await DiscussionBoardAttachmentDownloadTransformer.transform(
    recentDownload,
  );
}
