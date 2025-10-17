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
  // 1. Fetch the target admin
  const target = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { id: props.adminId, deleted_at: null },
  });
  if (!target) {
    throw new HttpException("Admin account not found or deleted", 404);
  }

  // 2. Authorization: only superuser admins can update other admins
  // (non-superusers can only update themselves, and not superuser status!)
  if (
    props.admin.id !== target.id &&
    !(
      await MyGlobal.prisma.community_platform_admins.findFirst({
        where: {
          id: props.admin.id,
          superuser: true,
          deleted_at: null,
          status: "active",
        },
      })
    )?.superuser
  ) {
    throw new HttpException(
      "Forbidden: Only superusers can update other admin accounts",
      403,
    );
  }

  // 3. Validate attempted status update
  if (
    props.body.status &&
    !["active", "suspended", "deleted"].includes(props.body.status)
  ) {
    throw new HttpException("Invalid admin status update value", 400);
  }

  // 4. Prepare updates
  // Prevent demotion if this is the last superuser
  let willBeSuperuser = target.superuser;
  if (props.body.superuser !== undefined) {
    willBeSuperuser = props.body.superuser;
  }
  if (!willBeSuperuser) {
    const superuserCount =
      await MyGlobal.prisma.community_platform_admins.count({
        where: {
          superuser: true,
          deleted_at: null,
          status: "active",
          id: { not: target.id },
        },
      });
    if (superuserCount === 0) {
      throw new HttpException(
        "Cannot demote last remaining superuser; at least one superuser must remain.",
        400,
      );
    }
  }

  // 5. Carry out update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_admins.update({
    where: { id: target.id },
    data: {
      email: props.body.email ?? undefined,
      superuser: props.body.superuser ?? undefined,
      status: props.body.status ?? undefined,
      updated_at: now,
    },
  });

  // 6. Return mapped result
  return {
    id: updated.id,
    email: updated.email,
    superuser: updated.superuser,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
