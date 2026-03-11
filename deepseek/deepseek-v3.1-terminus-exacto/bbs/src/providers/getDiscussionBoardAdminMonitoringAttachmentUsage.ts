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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// Analytics DTO for attachment usage statistics
export interface IAttachmentUsageAnalytics {
  total_attachments: number & tags.Type<"int32">;
  total_storage_bytes: number & tags.Type<"int64">;
  average_file_size: number & tags.Type<"int32">;
  file_type_distribution: Array<{
    filetype: string;
    count: number & tags.Type<"int32">;
  }>;
  total_downloads: number & tags.Type<"int32">;
  actor_type_distribution: Array<{
    actor_type: string;
    count: number & tags.Type<"int32">;
  }>;
  generated_at: string & tags.Format<"date-time">;
}
// Simple in-memory cache implementation
const cacheStore = new Map<
  string,
  {
    data: any;
    expiry: number;
  }
>();
async function getCachedStats(
  key: string,
): Promise<IAttachmentUsageAnalytics | null> {
  const cached = cacheStore.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return cached.data;
}
async function setCachedStats(
  key: string,
  data: IAttachmentUsageAnalytics,
  ttlSeconds: number,
): Promise<void> {
  const expiry = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { data, expiry });
}
export async function getDiscussionBoardAdminMonitoringAttachmentUsage(props: {
  admin: AdminPayload;
}): Promise<IAttachmentUsageAnalytics> {
  // Admin authorization is already handled by the decorator
  // Check cache (5-minute TTL)
  const cacheKey = "attachment_usage_stats";
  const cached = await getCachedStats(cacheKey);
  if (cached) {
    return cached;
  }
  // Query attachment statistics
  const attachmentStats =
    await MyGlobal.prisma.discussion_board_attachments.aggregate({
      where: { deleted_at: null },
      _count: { id: true },
      _sum: { size_bytes: true },
      _avg: { size_bytes: true },
    });
  // Query file type distribution
  const fileTypeDistribution =
    await MyGlobal.prisma.discussion_board_attachments.groupBy({
      by: ["filetype"],
      where: { deleted_at: null },
      _count: { id: true },
    });
  // Query download statistics
  const downloadStats =
    await MyGlobal.prisma.discussion_board_attachment_downloads.aggregate({
      where: { deleted_at: null },
      _count: { id: true },
    });
  // Query actor type distribution
  const actorTypeDistribution =
    await MyGlobal.prisma.discussion_board_attachment_downloads.groupBy({
      by: ["actor_type"],
      where: { deleted_at: null },
      _count: { id: true },
    });
  // Build analytics response
  const analytics: IAttachmentUsageAnalytics = {
    total_attachments: attachmentStats._count.id || 0,
    total_storage_bytes: attachmentStats._sum.size_bytes || 0,
    average_file_size: Math.round(attachmentStats._avg.size_bytes || 0),
    file_type_distribution: fileTypeDistribution.map((item) => ({
      filetype: item.filetype,
      count: item._count.id,
    })),
    total_downloads: downloadStats._count.id || 0,
    actor_type_distribution: actorTypeDistribution.map((item) => ({
      actor_type: item.actor_type,
      count: item._count.id,
    })),
    generated_at: toISOStringSafe(new Date()),
  };
  // Cache the results for 5 minutes
  await setCachedStats(cacheKey, analytics, 300);
  return analytics;
}
