import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify requesting member is in the organization and holds the Owner role
  const requesterMembership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            is_builtin: true,
            name: true,
          },
        },
      },
    });
  if (requesterMembership === null) {
    throw new HttpException(
      "Forbidden: you are not a member of this organization",
      403,
    );
  }
  if (
    !requesterMembership.role.is_builtin ||
    requesterMembership.role.name !== "Owner"
  ) {
    throw new HttpException(
      "Forbidden: only the organization Owner can delete custom roles",
      403,
    );
  }
  // Step 2: Verify the target role exists in this organization
  const targetRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.roleId,
      erp_hrm_organization_id: props.organizationId,
    },
    select: {
      id: true,
      name: true,
      is_builtin: true,
    },
  });
  if (targetRole === null) {
    throw new HttpException(
      "Not Found: role does not exist in this organization",
      404,
    );
  }
  // Step 3: Check if it is a built-in role
  if (targetRole.is_builtin) {
    throw new HttpException(
      "Bad Request: built-in roles cannot be deleted",
      400,
    );
  }
  // Step 4: Check if any active members are currently assigned this role
  const assignedMemberCount =
    await MyGlobal.prisma.erp_hrm_organization_members.count({
      where: {
        role_id: props.roleId,
        deleted_at: null,
      },
    });
  if (assignedMemberCount > 0) {
    throw new HttpException(
      "Conflict: the role has members assigned to it and cannot be deleted; reassign all members first",
      409,
    );
  }
  // Step 5: Delete the role (with explicit permission deletion for atomicity) and write activity log
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Explicitly delete all permission codes for this role (cascade would handle it, but explicit deletion ensures atomicity)
    await tx.erp_hrm_role_permissions.deleteMany({
      where: { role_id: props.roleId },
    });
    // Delete the role itself
    await tx.erp_hrm_roles.delete({
      where: { id: props.roleId },
    });
    // Insert activity log entry recording the deletion event
    await tx.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        organization_id: props.organizationId,
        organization_member_id: requesterMembership.id,
        action_type: "role_deleted",
        target_entity_type: "role",
        target_entity_id: props.roleId,
        details: `Custom role '${targetRole.name}' was permanently deleted by the organization owner.`,
        created_at: new Date().toISOString(),
      },
    });
  });
}
