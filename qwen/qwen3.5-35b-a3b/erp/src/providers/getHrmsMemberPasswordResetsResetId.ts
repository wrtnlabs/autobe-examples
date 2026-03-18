import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberPasswordResetTransformer } from "../transformers/HrmsMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IHrmsMemberPasswordReset> {
  // Query password reset record with member relation for authorization check
  // Token is NOT selected to prevent credential exposure
  const reset =
    await MyGlobal.prisma.hrms_member_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            password_hash: true,
            avatar_uri: true,
            phone_number: true,
          },
        },
      },
    });
  // Authorization check 1: Is current member the owner of this password reset?
  const isOwner = reset.member.id === props.member.id;
  if (isOwner) {
    // Owner can always view their own password reset records
    return await HrmsMemberPasswordResetTransformer.transform(reset);
  }
  // Authorization check 2: Does current member have admin/owner role in any organization?
  // Query all organization memberships for the current member
  const memberships = await MyGlobal.prisma.hrms_organization_members.findMany({
    where: {
      hrms_member_id: props.member.id,
    },
    select: {
      hrms_organization_role_id: true,
    },
  });
  // Get role details for all memberships
  const roleIds = memberships.map((m) => m.hrms_organization_role_id);
  const roles = await MyGlobal.prisma.hrms_organization_roles.findMany({
    where: {
      id: { in: roleIds },
    },
    select: { name: true },
  });
  // Check if any role is admin or owner
  const roleNames = roles.map((r) => r.name.toLowerCase());
  const hasAdminOrOwnerRole = roleNames.some(
    (name) => name === "admin" || name === "owner",
  );
  if (hasAdminOrOwnerRole) {
    return await HrmsMemberPasswordResetTransformer.transform(reset);
  }
  // No authorization granted
  throw new HttpException("Forbidden", 403);
}
