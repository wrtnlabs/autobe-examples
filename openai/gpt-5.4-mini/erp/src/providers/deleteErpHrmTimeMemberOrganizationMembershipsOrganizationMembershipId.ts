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

export async function deleteErpHrmTimeMemberOrganizationMembershipsOrganizationMembershipId(props: {
  member: MemberPayload;
  organizationMembershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findUniqueOrThrow(
      {
        where: {
          id: props.organizationMembershipId,
        },
        select: {
          id: true,
          erp_hrm_time_member_id: true,
          erp_hrm_time_organization_id: true,
          status: true,
          is_selected_context: true,
          organization: {
            select: {
              id: true,
              owner_member_id: true,
            },
          },
        },
      },
    );
  const actorAccess =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
      },
    });
  if (actorAccess === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    membership.erp_hrm_time_member_id ===
    membership.organization.owner_member_id
  ) {
    const ownerMembershipCount =
      await MyGlobal.prisma.erp_hrm_time_organization_memberships.count({
        where: {
          erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
          erp_hrm_time_member_id: membership.organization.owner_member_id,
          deleted_at: null,
          status: "active",
        },
      });
    if (ownerMembershipCount <= 1) {
      throw new HttpException(
        "Transfer ownership or delete the organization first",
        409,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_organization_memberships.delete({
      where: {
        id: membership.id,
      },
    });
  });
}
