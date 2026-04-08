import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationMembershipTransformer } from "../transformers/ErpHrmTimeOrganizationMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberOrganizationMembershipsOrganizationMembershipId(props: {
  member: MemberPayload;
  organizationMembershipId: string & tags.Format<"uuid">;
  body: IErpHrmTimeOrganizationMembership.IUpdate;
}): Promise<IErpHrmTimeOrganizationMembership> {
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
          deleted_at: true,
        },
      },
    );
  if (membership.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (membership.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    if (props.body.is_selected_context === true) {
      await prisma.erp_hrm_time_organization_memberships.updateMany({
        where: {
          erp_hrm_time_member_id: props.member.id,
          erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
          deleted_at: null,
          id: {
            not: props.organizationMembershipId,
          },
        },
        data: {
          is_selected_context: false,
          updated_at: new Date(),
        },
      });
    }
    await prisma.erp_hrm_time_organization_memberships.update({
      where: {
        id: props.organizationMembershipId,
      },
      data: {
        ...(props.body.status !== undefined
          ? { status: props.body.status }
          : {}),
        ...(props.body.is_selected_context !== undefined
          ? { is_selected_context: props.body.is_selected_context }
          : {}),
        updated_at: new Date(),
      },
    });
    return await prisma.erp_hrm_time_organization_memberships.findUniqueOrThrow(
      {
        where: {
          id: props.organizationMembershipId,
        },
        ...ErpHrmTimeOrganizationMembershipTransformer.select(),
      },
    );
  });
  return await ErpHrmTimeOrganizationMembershipTransformer.transform(updated);
}
