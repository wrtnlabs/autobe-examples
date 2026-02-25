import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postEconomicBoardSuperAdministratorAdminUsersUserIdPromote(props: {
  superAdministrator: SuperadministratorPayload;
  userId: string;
}): Promise<IEconomicBoardCitizen> {
  // Validate super administrator
  const superAdmin =
    await MyGlobal.prisma.economic_board_super_administrators.findFirst({
      where: { id: props.superAdministrator.id },
    });
  if (!superAdmin) {
    throw new HttpException("Insufficient permissions", 403);
  }
  // Find target citizen
  const target = await MyGlobal.prisma.economic_board_citizens.findUnique({
    where: { id: props.userId },
    ...EconomicBoardCitizenTransformer.select(),
  });
  if (!target) {
    throw new HttpException("User not found", 404);
  }
  // Check if target is already an administrator
  const alreadyAdmin =
    await MyGlobal.prisma.economic_board_administrators.findUnique({
      where: { id: props.userId },
    });
  if (alreadyAdmin) {
    throw new HttpException("ECONOMICBOARD_USER_ALREADY_ADMIN", 400);
  }
  // Insert into administrator table - Added required password_hash field
  await MyGlobal.prisma.economic_board_administrators.create({
    data: {
      id: target.id,
      email: target.email,
      display_name: target.display_name,
      bio: target.bio,
      is_banned: false,
      admin_request_status: "approved",
      created_at: target.created_at,
      updated_at: target.updated_at,
      password_hash: "", // Changed null to empty string to satisfy string type requirement
    },
  });
  // Log the promotion - Using correct schema fields only
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.superAdministrator.id,
      target_id: props.userId,
      action_type: "promote_to_admin",
      reason: "Promoted to administrator by super administrator",
      ip_address: "", // Required field per schema, set to empty string as not available in context
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">, // added as required
    },
  });
  // Delete original citizen record
  await MyGlobal.prisma.economic_board_citizens.delete({
    where: { id: props.userId },
  });
  // Return transformed result
  return await EconomicBoardCitizenTransformer.transform(target);
}
