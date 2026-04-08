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

export async function postErpHrmTimeMemberOrganizationMemberships(props: {
  member: MemberPayload;
  body: IErpHrmTimeOrganizationMembership.ICreate;
}): Promise<IErpHrmTimeOrganizationMembership> {
  const selectedMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
          member: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  const targetMember = await MyGlobal.prisma.erp_hrm_time_members.findUnique({
    where: {
      id: props.body.employeeId,
    },
    select: {
      id: true,
    },
  });
  if (targetMember === null) {
    throw new HttpException("Member not found", 404);
  }
  const duplicate =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findUnique({
      where: {
        erp_hrm_time_member_id_erp_hrm_time_organization_id: {
          erp_hrm_time_member_id: props.body.employeeId,
          erp_hrm_time_organization_id:
            selectedMembership.erp_hrm_time_organization_id,
        },
      },
      select: {
        id: true,
      },
    });
  if (duplicate !== null) {
    throw new HttpException("Membership already exists", 409);
  }
  const created =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.create({
      data: {
        id: v4(),
        erp_hrm_time_member_id: props.body.employeeId,
        erp_hrm_time_organization_id:
          selectedMembership.erp_hrm_time_organization_id,
        status: "active",
        is_selected_context: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...ErpHrmTimeOrganizationMembershipTransformer.select(),
    });
  return await ErpHrmTimeOrganizationMembershipTransformer.transform(created);
}
