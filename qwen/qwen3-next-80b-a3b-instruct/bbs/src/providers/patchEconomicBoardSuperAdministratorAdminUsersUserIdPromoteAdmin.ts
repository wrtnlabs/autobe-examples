import { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
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
import { EconomicBoardCitizenTransformer } from "../transformers/EconomicBoardCitizenTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardSuperAdministratorAdminUsersUserIdPromoteAdmin(props: {
  superAdministrator: SuperadministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconomicBoardAdministratorAuditLog;
}): Promise<IEconomicBoardCitizen> {
  // Validate reason length per DTO spec
  if (props.body.reason && props.body.reason.length > 500) {
    throw new HttpException("Reason exceeds 500 characters", 400);
  }
  // 1. Validate citizen exists
  const citizen =
    await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
      where: { id: props.userId },
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        is_banned: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Ensure user is not already an administrator or super administrator
  const existingAdmin =
    await MyGlobal.prisma.economic_board_administrators.findUnique({
      where: { id: props.userId },
    });
  if (existingAdmin !== null) {
    throw new HttpException("User is already an administrator", 409);
  }
  const existingSuperAdmin =
    await MyGlobal.prisma.economic_board_super_administrators.findUnique({
      where: { id: props.userId },
    });
  if (existingSuperAdmin !== null) {
    throw new HttpException("User is already a super administrator", 409);
  }
  // 2. Create new administrator record
  await MyGlobal.prisma.economic_board_administrators.create({
    data: {
      id: citizen.id,
      email: citizen.email,
      display_name: citizen.display_name,
      bio: citizen.bio,
      created_at: citizen.created_at,
      updated_at: citizen.updated_at,
      admin_request_reason: props.body.reason,
      admin_request_status: "pending",
      is_banned: citizen.is_banned,
      password_hash: "",
    },
  });
  // 3. Update citizen: set is_banned to false if it was true
  if (citizen.is_banned) {
    await MyGlobal.prisma.economic_board_citizens.update({
      where: { id: props.userId },
      data: { is_banned: false, ban_reason: null },
    });
  }
  // 4. Log audit entry
  // IP address: In a real system, this would come from request headers via middleware
  // For this context, since we have no access to request, use fallback as placeholder
  // In production, this would be dynamically captured in middleware and injected
  const ipAddress = "127.0.0.1";
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.superAdministrator.id,
      target_id: props.userId,
      action_type: "promote",
      reason: props.body.reason ?? null,
      ip_address: ipAddress,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // 5. Return updated citizen using transformer to ensure type-safe output
  const updatedCitizen =
    await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
      where: { id: props.userId },
      ...EconomicBoardCitizenTransformer.select(),
    });
  return await EconomicBoardCitizenTransformer.transform(updatedCitizen);
}
