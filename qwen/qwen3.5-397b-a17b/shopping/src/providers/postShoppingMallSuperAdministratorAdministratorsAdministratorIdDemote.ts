import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallAdministratorTransformer } from "../transformers/ShoppingMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdministratorAdministratorsAdministratorIdDemote(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministrator.IDemote;
}): Promise<IShoppingMallAdministrator> {
  // Verify target administrator exists
  const target =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
    });
  // Check for self-demotion - super administrators cannot demote themselves
  if (props.administratorId === props.superAdministrator.id) {
    throw new HttpException("Self-demotion is not allowed", 403);
  }
  // Count current super administrators to ensure at least one remains after demotion
  const superAdminCount =
    await MyGlobal.prisma.shopping_mall_super_administrators.count({
      where: {
        deleted_at: null,
      },
    });
  // If only one super admin exists, reject demotion to prevent zero super admins
  if (superAdminCount <= 1) {
    throw new HttpException(
      "At least one super administrator must remain in the system",
      400,
    );
  }
  // Perform demotion in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create grade change audit record
    await tx.shopping_mall_administrator_grade_changes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_administrator_id: props.administratorId,
        shopping_mall_super_administrator_id: props.superAdministrator.id,
        previous_grade: "super_administrator",
        new_grade: "administrator",
        reason: props.body.reason ?? null,
        created_at: new Date(),
      },
    });
    // Return the administrator entity for transformation with all required relations
    return tx.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      include: {
        sessions: true,
        passwordResets: true,
        sellerApprovalRequestSnapshots: true,
        reviewedApprovalRequests: true,
        gradeChanges: true,
      },
    });
  });
  return await ShoppingMallAdministratorTransformer.transform(result);
}
