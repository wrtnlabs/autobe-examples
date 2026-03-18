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
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Find target org member (must exist and not be deleted)
    const targetMember = await tx.erp_hrm_organization_members.findFirstOrThrow(
      {
        where: {
          id: props.organizationMemberId,
          deleted_at: null,
        },
        select: {
          id: true,
          organization_id: true,
          member_id: true,
          role_id: true,
        },
      },
    );
    // Step 2: Load the organization to check owner
    const organization = await tx.erp_hrm_organizations.findFirstOrThrow({
      where: {
        id: targetMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_member_id: true,
      },
    });
    // Step 3: Find requesting member's org member record in the same organization
    const requesterOrgMember = await tx.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: targetMember.organization_id,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission_code: true,
              },
            },
          },
        },
      },
    });
    if (requesterOrgMember === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Step 4: Authorize requester (Owner role OR org:manage permission)
    const isOwnerRole = requesterOrgMember.role.name === "Owner";
    const hasOrgManage = requesterOrgMember.role.permissions.some(
      (p) => p.permission_code === "org:manage",
    );
    if (!isOwnerRole && !hasOrgManage) {
      throw new HttpException("Forbidden", 403);
    }
    // Step 5: Guard — cannot remove the organization owner
    if (targetMember.member_id === organization.owner_member_id) {
      throw new HttpException(
        "Cannot remove the organization owner's membership",
        403,
      );
    }
    // Step 6: Soft-delete the target member
    await tx.erp_hrm_organization_members.update({
      where: { id: props.organizationMemberId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
