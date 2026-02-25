import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAuditLogTransformer } from "../transformers/DiscussionBoardAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorAuditLogsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardAuditLog.IUpdate;
}): Promise<IDiscussionBoardAuditLog> {
  await MyGlobal.prisma.discussion_board_audit_logs.update({
    where: { id: props.id },
    data: {
      ...(props.body.eventType !== undefined && {
        event_type: props.body.eventType,
      }),
      ...(props.body.eventDescription !== undefined && {
        event_description: props.body.eventDescription,
      }),
      ...(props.body.createdAt !== undefined && {
        created_at: props.body.createdAt,
      }),
      ...(props.body.updatedAt !== undefined && {
        updated_at: props.body.updatedAt,
      }),
      ...(props.body.deletedAt !== undefined && {
        deleted_at: props.body.deletedAt,
      }),
    },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_audit_logs.findUniqueOrThrow({
      where: { id: props.id },
      ...DiscussionBoardAuditLogTransformer.select(),
    });
  return await DiscussionBoardAuditLogTransformer.transform(updated);
}
