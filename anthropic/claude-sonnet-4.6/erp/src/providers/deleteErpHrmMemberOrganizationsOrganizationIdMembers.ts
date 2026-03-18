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

export async function deleteErpHrmMemberOrganizationsOrganizationIdMembers(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the organization exists and is active
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Look up the caller's active organization member record
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            name: true,
            is_builtin: true,
          },
        },
      },
    });
  // Step 3: Enforce sole-owner restriction
  const isOwnerRole =
    orgMember.role.name === "Owner" && orgMember.role.is_builtin === true;
  if (isOwnerRole) {
    // Count all active members holding the Owner role in this organization
    const ownerCount = await MyGlobal.prisma.erp_hrm_organization_members.count(
      {
        where: {
          organization_id: props.organizationId,
          deleted_at: null,
          role: {
            name: "Owner",
            is_builtin: true,
          },
        },
      },
    );
    if (ownerCount <= 1) {
      throw new HttpException(
        "Sole owners cannot leave an organization without first transferring ownership or deleting the organization.",
        422,
      );
    }
  }
  // Step 4: Soft-delete the organization member record
  await MyGlobal.prisma.erp_hrm_organization_members.update({
    where: { id: orgMember.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
