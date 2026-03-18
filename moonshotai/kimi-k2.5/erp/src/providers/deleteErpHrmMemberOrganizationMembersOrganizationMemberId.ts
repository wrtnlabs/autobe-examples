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

export async function deleteErpHrmMemberOrganizationMembersOrganizationMemberId(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get the requesting member's organization membership with role permissions
  const requestingMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  if (requestingMember === null) {
    throw new HttpException("Organization membership not found", 404);
  }
  // Check if requesting member has employee management permission
  // Built-in roles: Owner and Manager have employee management permission
  const hasManagePermission =
    requestingMember.role.name === "Owner" ||
    requestingMember.role.name === "Manager";
  if (!hasManagePermission) {
    throw new HttpException(
      "Forbidden: Requires employee management permission",
      403,
    );
  }
  // Verify the target organization member exists and belongs to same organization
  const targetMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        id: props.organizationMemberId,
        organization_id: requestingMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        user_id: true,
      },
    });
  if (targetMember === null) {
    throw new HttpException("Organization member not found", 404);
  }
  // Prevent self-deletion
  if (targetMember.user_id === props.member.id) {
    throw new HttpException("Cannot delete your own membership", 400);
  }
  // Check for active contracts
  const activeContracts = await MyGlobal.prisma.erp_hrm_contracts.findMany({
    where: {
      organization_member_id: props.organizationMemberId,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (activeContracts.length > 0) {
    throw new HttpException(
      "Cannot delete member with active contracts. Please terminate contracts first.",
      400,
    );
  }
  const now = new Date();
  // Delete active timers (hard delete - they represent in-progress work that won't complete)
  await MyGlobal.prisma.erp_hrm_timers.deleteMany({
    where: {
      organization_member_id: props.organizationMemberId,
    },
  });
  // Soft delete project member records
  await MyGlobal.prisma.erp_hrm_project_members.updateMany({
    where: {
      organization_member_id: props.organizationMemberId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Soft delete contracts
  await MyGlobal.prisma.erp_hrm_contracts.updateMany({
    where: {
      organization_member_id: props.organizationMemberId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Soft delete the organization member
  await MyGlobal.prisma.erp_hrm_organization_members.update({
    where: {
      id: props.organizationMemberId,
    },
    data: {
      is_active: false,
      deleted_at: now,
      updated_at: now,
    },
  });
  // Log the deletion event for audit
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: targetMember.organization_id,
      actor_member_id: requestingMember.id,
      action: "employee_deleted",
      entity_type: "organization_member",
      entity_id: props.organizationMemberId,
      ip_address: null,
      user_agent: null,
      created_at: now,
    },
  });
}
