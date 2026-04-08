import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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

export async function getErpHrmTimeMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeOrganizationDashboardSummary> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
      },
      select: {
        id: true,
        owner_member_id: true,
        name: true,
        description: true,
        logo_image_url: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (organization.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: organization.id,
    ownerMember: {} satisfies IErpHrmTimeMember.ISummary,
    name: organization.name,
    description: organization.description,
    logoImageUrl: organization.logo_image_url,
    status: organization.status,
    createdAt: organization.created_at.toISOString(),
    updatedAt: organization.updated_at.toISOString(),
    deletedAt: organization.deleted_at?.toISOString() ?? null,
  };
}
