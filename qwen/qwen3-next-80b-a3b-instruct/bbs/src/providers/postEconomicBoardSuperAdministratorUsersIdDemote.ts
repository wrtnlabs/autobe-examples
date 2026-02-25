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

export async function postEconomicBoardSuperAdministratorUsersIdDemote(props: {
  superAdministrator: SuperadministratorPayload;
  id: string;
}): Promise<IEconomicBoardCitizen> {
  // 1. Validate that the requesting user is a super administrator
  const assertingSuperAdmin =
    await MyGlobal.prisma.economic_board_super_administrators.findFirst({
      where: { id: props.superAdministrator.id },
    });
  if (!assertingSuperAdmin) {
    throw new HttpException("You are not a super administrator", 403);
  }
  // 2. Find the target user in super_administrators table
  const targetSuperAdmin =
    await MyGlobal.prisma.economic_board_super_administrators.findFirst({
      where: { id: props.id },
    });
  // 3. Deny demotion if target is self
  if (targetSuperAdmin?.id === props.superAdministrator.id) {
    throw new HttpException(
      "Super administrators cannot demote themselves.",
      400,
    );
  }
  // 4. If target is not a super administrator, reject
  if (!targetSuperAdmin) {
    throw new HttpException("Target user is not a super administrator.", 404);
  }
  // 5. Delete the target from super_administrators table
  await MyGlobal.prisma.economic_board_super_administrators.delete({
    where: { id: props.id },
  });
  // 6. Ensure the target exists as an administrator in economic_board_administrators
  let targetAdmin =
    await MyGlobal.prisma.economic_board_administrators.findUnique({
      where: { id: props.id },
    });
  if (!targetAdmin) {
    // Retrieve the citizen's email and other metadata to create admin record
    const citizen = await MyGlobal.prisma.economic_board_citizens.findUnique({
      where: { id: props.id },
      select: { email: true, display_name: true, bio: true },
    });
    if (!citizen) {
      throw new HttpException("Target user does not exist as a citizen.", 404);
    }
    const now = new Date().toISOString() as string & tags.Format<"date-time">;
    targetAdmin = await MyGlobal.prisma.economic_board_administrators.create({
      data: {
        id: props.id,
        email: citizen.email,
        password_hash: "", // Missing: Since this is demotion, we must assume password is known or reset required
        display_name: citizen.display_name,
        bio: citizen.bio,
        is_banned: false,
        ban_reason: null,
        admin_request_status: "approved",
        admin_request_reason: "Demoted from super administrator.",
        created_at: now,
        updated_at: now,
      },
    });
  }
  // 7. Log the demotion action
  const auditLogCreatedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.superAdministrator.id,
      target_id: props.id,
      action_type: "demote",
      reason: "Super administrator demoted by another super administrator.",
      ip_address: "0.0.0.0",
      created_at: auditLogCreatedAt,
      updated_at: auditLogCreatedAt,
    },
  });
  // 8. Update the target's updated_at timestamp in economic_board_administrators
  await MyGlobal.prisma.economic_board_administrators.update({
    where: { id: props.id },
    data: { updated_at: auditLogCreatedAt },
  });
  // 9. Return the updated citizen record using the transformer for type safety
  const citizen = await MyGlobal.prisma.economic_board_citizens.findUnique({
    where: { id: props.id },
    ...EconomicBoardCitizenTransformer.select(),
  });
  if (!citizen) {
    throw new HttpException("Demoted user record not found.", 404);
  }
  return await EconomicBoardCitizenTransformer.transform(citizen);
}
