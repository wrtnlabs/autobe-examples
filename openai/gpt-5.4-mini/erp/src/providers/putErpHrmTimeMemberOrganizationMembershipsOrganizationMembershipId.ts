import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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
        where: { id: props.organizationMembershipId },
        select: {
          id: true,
          erp_hrm_time_member_id: true,
          erp_hrm_time_organization_id: true,
          is_selected_context: true,
          deleted_at: true,
        },
      },
    );
  const activeContext =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (
    activeContext === null ||
    activeContext.erp_hrm_time_organization_id !==
      membership.erp_hrm_time_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.isSelectedContext === true) {
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.updateMany({
      where: {
        erp_hrm_time_member_id: props.member.id,
        is_selected_context: true,
        deleted_at: null,
        NOT: { id: props.organizationMembershipId },
      },
      data: {
        is_selected_context: false,
        updated_at: new Date(),
      },
    });
  }
  await MyGlobal.prisma.erp_hrm_time_organization_memberships.update({
    where: { id: props.organizationMembershipId },
    data: {
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.isSelectedContext !== undefined && {
        is_selected_context: props.body.isSelectedContext,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findUniqueOrThrow(
      {
        where: { id: props.organizationMembershipId },
        ...ErpHrmTimeOrganizationMembershipTransformer.select(),
      },
    );
  return await ErpHrmTimeOrganizationMembershipTransformer.transform(updated);
}
