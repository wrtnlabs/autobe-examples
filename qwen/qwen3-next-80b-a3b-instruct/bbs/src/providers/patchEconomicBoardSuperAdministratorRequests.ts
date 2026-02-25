import { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
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

export async function patchEconomicBoardSuperAdministratorRequests(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEconomicBoardAdministratorAuditLog;
}): Promise<void> {
  // Validate that target_id is provided and is a user
  if (!props.body.target_id) {
    throw new HttpException("Target user ID is required", 400);
  }
  // First, fetch just the ID to verify existence
  const citizen = await MyGlobal.prisma.economic_board_citizens.findUnique({
    where: { id: props.body.target_id },
    select: { id: true },
  });
  if (!citizen) {
    throw new HttpException("Target user not found", 404);
  }
  // Update citizen's admin request status
  await MyGlobal.prisma.economic_board_citizens.update({
    where: { id: props.body.target_id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Create audit log entry using proper relation names and type-safe fields
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: props.body.id as string & tags.Format<"uuid">,
      actor_id: props.superAdministrator.id as string & tags.Format<"uuid">,
      target_id: props.body.target_id as string & tags.Format<"uuid">,
      action_type: props.body.action_type,
      reason: props.body.reason || null,
      ip_address: props.body.ip_address,
      created_at: props.body.created_at as string & tags.Format<"date-time">,
      updated_at: props.body.updated_at as string & tags.Format<"date-time">,
    },
  });
}
