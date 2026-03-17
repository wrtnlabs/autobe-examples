import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeOwnerAuditLogTransformer } from "../transformers/RedditLikeOwnerAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeOwnerAuditLogsAuditLogId(props: {
  owner: OwnerPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeOwnerAuditLog> {
  const auditLog =
    await MyGlobal.prisma.reddit_like_owner_audit_logs.findUniqueOrThrow({
      where: { id: props.auditLogId },
      ...RedditLikeOwnerAuditLogTransformer.select(),
    });
  return await RedditLikeOwnerAuditLogTransformer.transform(auditLog);
}
