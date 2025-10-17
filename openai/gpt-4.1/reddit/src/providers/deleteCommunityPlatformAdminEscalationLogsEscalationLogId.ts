import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminEscalationLogsEscalationLogId(props: {
  admin: AdminPayload;
  escalationLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the escalation log to check existence (throws 404 if not found)
  await MyGlobal.prisma.community_platform_escalation_logs.findUniqueOrThrow({
    where: { id: props.escalationLogId },
  });

  // Hard delete the escalation log entry
  await MyGlobal.prisma.community_platform_escalation_logs.delete({
    where: { id: props.escalationLogId },
  });
}
