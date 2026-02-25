import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdministratorAdministratorUnbansUnbanId(props: {
  superAdministrator: SuperadministratorPayload;
  unbanId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.discussion_board_user_unbans.findUniqueOrThrow({
    where: { id: props.unbanId },
    select: { id: true },
  });
  await MyGlobal.prisma.discussion_board_user_unbans.delete({
    where: { id: props.unbanId },
  });
  const auditLogId = v4() as unknown as string & tags.Format<"uuid">;
  const createdAt = new Date().toISOString() satisfies string &
    tags.Format<"date-time"> as string & tags.Format<"date-time">;
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: auditLogId,
      target_id: props.unbanId,
      administrator_id: props.superAdministrator.id,
      created_at: createdAt,
    },
  });
}
