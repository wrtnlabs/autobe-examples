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

export async function deleteDiscussionBoardAdminApiRateLimitsRateLimitId(props: {
  admin: AdminPayload;
  rateLimitId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the rate limit exists
  const rateLimit =
    await MyGlobal.prisma.discussion_board_api_rate_limits.findUniqueOrThrow({
      where: { id: props.rateLimitId },
    });
  // Perform the hard delete
  await MyGlobal.prisma.discussion_board_api_rate_limits.delete({
    where: { id: props.rateLimitId },
  });
  // Log the deletion for audit purposes
  const now = new Date();
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.admin.id,
      actor_type: "admin",
      action_type: "DELETE_RATE_LIMIT",
      target_article_id: null,
      target_comment_id: null,
      target_section_id: null,
      target_user_id: null,
      target_admin_id: null,
      target_super_admin_id: null,
      description: `Deleted API rate limit configuration for endpoint: ${rateLimit.endpoint_path}, method: ${rateLimit.http_method}`,
      ip_address: null,
      user_agent: null,
      metadata: null,
      success: true,
      error_message: null,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });
}
