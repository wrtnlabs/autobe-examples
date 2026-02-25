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
import { DiscussionBoardAuditLogCollector } from "../collectors/DiscussionBoardAuditLogCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAuditLogTransformer } from "../transformers/DiscussionBoardAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAuditLog.ICreate;
}): Promise<IDiscussionBoardAuditLog> {
  // Collect data for prisma create
  const data = await DiscussionBoardAuditLogCollector.collect({
    body: props.body,
  });
  // Create record in DB
  const created = await MyGlobal.prisma.discussion_board_audit_logs.create({
    data,
    ...DiscussionBoardAuditLogTransformer.select(),
  });
  // Transform created record to response DTO
  return await DiscussionBoardAuditLogTransformer.transform(created);
}
