import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscriptionAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionAuditLog";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorCommunitySubscriptionsCommunitySubscriptionIdAuditLogsSubscriptionAuditLogId(props: {
  administrator: AdministratorPayload;
  communitySubscriptionId: string & tags.Format<"uuid">;
  subscriptionAuditLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscriptionAuditLog> {
  const auditLog =
    await MyGlobal.prisma.community_platform_subscription_audit_logs.findUnique(
      {
        where: { id: props.subscriptionAuditLogId },
        include: {
          user: true,
          community: true,
          post: true,
          comment: {
            include: {
              user: true,
              post: true,
            },
          },
        },
      },
    );

  if (!auditLog) {
    throw new HttpException("Audit log entry not found.", 404);
  }

  // User summary (always present in audit logs)
  const user: ICommunityPlatformUser.ISummary = { id: auditLog.user.id };

  // Community summary (optional)
  const community: ICommunityPlatformCommunity.ISummary | null | undefined =
    auditLog.community
      ? {
          id: auditLog.community.id,
          name: auditLog.community.name,
          display_title: auditLog.community.display_title,
          description: auditLog.community.description,
          visibility: auditLog.community.visibility,
          image_url: auditLog.community.image_url ?? undefined,
          status: auditLog.community.status,
        }
      : undefined;

  // Post summary (optional)
  const post: ICommunityPlatformPost.ISummary | null | undefined = auditLog.post
    ? {
        id: auditLog.post.id,
        community_id: auditLog.post.community_id,
        user_id: auditLog.post.user_id,
        // Community and user summaries omitted
      }
    : undefined;

  // Comment summary (optional)
  let comment: ICommunityPlatformComment.ISummary | null | undefined =
    undefined;
  if (auditLog.comment && auditLog.comment.user && auditLog.comment.post) {
    comment = {
      id: auditLog.comment.id,
      user: { id: auditLog.comment.user.id },
      post: {
        id: auditLog.comment.post.id,
        community_id: auditLog.comment.post.community_id,
        user_id: auditLog.comment.post.user_id,
      },
      parent_id:
        auditLog.comment.parent_id !== null &&
        auditLog.comment.parent_id !== undefined
          ? (auditLog.comment.parent_id as string & tags.Format<"uuid">)
          : undefined,
      created_at:
        typeof auditLog.comment.created_at === "string"
          ? auditLog.comment.created_at
          : toISOStringSafe(auditLog.comment.created_at),
    };
  }

  return {
    id: auditLog.id,
    user,
    community: typeof community !== "undefined" ? community : null,
    post: typeof post !== "undefined" ? post : null,
    comment: typeof comment !== "undefined" ? comment : null,
    action: auditLog.action,
    action_metadata: auditLog.action_metadata ?? null,
    created_at:
      typeof auditLog.created_at === "string"
        ? auditLog.created_at
        : toISOStringSafe(auditLog.created_at),
  };
}
