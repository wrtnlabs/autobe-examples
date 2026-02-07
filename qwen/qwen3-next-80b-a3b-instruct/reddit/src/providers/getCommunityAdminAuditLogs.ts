import { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
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

export async function getCommunityAdminAuditLogs(props: {
  admin: AdminPayload;
}): Promise<ICommunityAuditLog[]> {
  const { admin } = props;
  const audits = await MyGlobal.prisma.community_audit_logs.findMany({
    where: { moderator_id: admin.id },
    orderBy: { created_at: "desc" },
  });
  return audits.map((audit) => ({
    id: audit.id as string & tags.Format<"uuid">,
    moderator_id: audit.moderator_id as string & tags.Format<"uuid">,
    target_id: audit.target_id as string & tags.Format<"uuid">,
    target_type: audit.target_type,
    action_type: audit.action_type,
    description: audit.description,
    created_at: toISOStringSafe(audit.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(audit.updated_at) as string &
      tags.Format<"date-time">,
  }));
}
