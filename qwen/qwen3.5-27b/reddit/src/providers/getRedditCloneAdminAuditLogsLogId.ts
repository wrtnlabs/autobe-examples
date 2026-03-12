import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { IRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCloneAdminAuditLogTransformer } from "../transformers/RedditCloneAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneAdminAuditLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneAdminAuditLog> {
  const log =
    await MyGlobal.prisma.reddit_clone_admin_audit_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...RedditCloneAdminAuditLogTransformer.select(),
    });
  return await RedditCloneAdminAuditLogTransformer.transform(log);
}
