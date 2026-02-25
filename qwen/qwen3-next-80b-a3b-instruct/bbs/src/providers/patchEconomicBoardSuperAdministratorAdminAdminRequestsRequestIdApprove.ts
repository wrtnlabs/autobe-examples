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
import { EconomicBoardAdministratorAuditLogTransformer } from "../transformers/EconomicBoardAdministratorAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardSuperAdministratorAdminAdminRequestsRequestIdApprove(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string;
}): Promise<IEconomicBoardAdministratorAuditLog> {
  // Begin transaction
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Find the citizen who submitted the request (requestId is the citizen's ID)
    const citizen = await prisma.economic_board_citizens.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        is_banned: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (!citizen) {
      throw new HttpException("Citizen not found", 404);
    }
    // Get current timestamp
    const now = new Date().toISOString();
    // Create new administrator record from citizen data
    await prisma.economic_board_administrators.create({
      data: {
        id: citizen.id,
        email: citizen.email,
        password_hash: citizen.password_hash,
        display_name: citizen.display_name,
        bio: citizen.bio,
        is_banned: false,
        ban_reason: null,
        created_at: now,
        updated_at: now,
      },
    });
    // Log the administrative action
    const auditLog =
      await prisma.economic_board_administrator_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_id: props.superAdministrator.id,
          target_id: citizen.id,
          action_type: "approve_admin_request",
          reason: "Approved by super administrator",
          ip_address: "0.0.0.0", // Placeholder - system should capture actual IP from context
          created_at: now,
          updated_at: now,
        },
        ...EconomicBoardAdministratorAuditLogTransformer.select(),
      });
    return auditLog;
  });
  return await EconomicBoardAdministratorAuditLogTransformer.transform(result);
}
