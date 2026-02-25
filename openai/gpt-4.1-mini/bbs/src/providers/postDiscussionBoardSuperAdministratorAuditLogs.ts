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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardAuditLogTransformer } from "../transformers/DiscussionBoardAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorAuditLogs(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAuditLog.ICreate;
}): Promise<IDiscussionBoardAuditLog> {
  const collected = await DiscussionBoardAuditLogCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.discussion_board_audit_logs.create({
      data: collected,
      ...DiscussionBoardAuditLogTransformer.select(),
    });
  });
  return await DiscussionBoardAuditLogTransformer.transform(created);
}
