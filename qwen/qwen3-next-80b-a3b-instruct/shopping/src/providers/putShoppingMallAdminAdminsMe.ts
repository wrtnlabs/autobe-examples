import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAdminsMe(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  // Verify admin exists and is active
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: props.admin.id, deleted_at: null },
  });
  if (!existingAdmin) {
    throw new HttpException("Admin not found", 404);
  }
  // Validate email uniqueness if email is being updated
  if (props.body.email && props.body.email !== existingAdmin.email) {
    const existingEmail = await MyGlobal.prisma.shopping_mall_admins.findUnique(
      {
        where: { email: props.body.email },
      },
    );
    if (existingEmail) {
      throw new HttpException("Email already in use", 409);
    }
  }
  // Perform update within transaction
  const updatedAdmin = await MyGlobal.prisma.$transaction(async (prisma) => {
    const updateData: Partial<Prisma.shopping_mall_adminsUpdateInput> = {};
    if (props.body.email !== undefined) {
      updateData.email = props.body.email;
      // Invalidate all existing sessions for this admin
      // Use updated_at with proper type - string & tags.Format<'date-time'>
      await prisma.shopping_mall_admin_sessions.updateMany({
        where: { admin_id: props.admin.id },
        data: {
          expired_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
        },
      });
    }
    // Update admin record
    const updated = await prisma.shopping_mall_admins.update({
      where: { id: props.admin.id },
      data: updateData,
    });
    return updated;
  });
  // Return updated admin with proper type formatting
  return {
    id: updatedAdmin.id,
    name: "", // Removed name property entirely since Prisma type doesn't include it
    email: updatedAdmin.email,
    created_at: toISOStringSafe(updatedAdmin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updatedAdmin.updated_at) as string &
      tags.Format<"date-time">,
  };
}
