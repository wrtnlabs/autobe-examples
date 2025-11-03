import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdmin.IUpdate;
}): Promise<ICommunityPlatformAdmin> {
  const { admin, adminId, body } = props;
  if (admin.type !== "admin") {
    throw new HttpException(
      "Unauthorized: Only admin accounts may update administrator profiles.",
      403,
    );
  }

  // Find target admin account
  const existing = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { id: adminId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException(
      "Administrator not found or has been deleted.",
      404,
    );
  }

  // If email is being changed, check uniqueness
  const isEmailChanged =
    typeof body.email === "string" && body.email !== existing.email;
  if (isEmailChanged) {
    const conflicting =
      await MyGlobal.prisma.community_platform_admins.findFirst({
        where: {
          email: body.email,
          deleted_at: null,
          NOT: { id: adminId },
        },
      });
    if (conflicting) {
      throw new HttpException(
        "Email is already in use by another administrator.",
        409,
      );
    }
  }

  // Prepare data for update: only update fields present in body
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof body.display_name === "string") {
    updateData.display_name = body.display_name;
  }
  if (typeof body.email === "string") {
    updateData.email = body.email;
  }

  const updated = await MyGlobal.prisma.community_platform_admins.update({
    where: { id: adminId },
    data: updateData,
  });

  // Audit log: record admin update (exclude password hash, only log visible fields)
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: admin.id,
      action: "admin_profile_update",
      target_type: "admin",
      target_id: adminId,
      metadata: JSON.stringify({
        updated_fields: Object.keys(updateData).filter(
          (k) => k !== "updated_at",
        ),
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
