import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationTransformer } from "../transformers/ErpHrmTimeOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberOrganizationsOrganizationIdOwnershipTransfer(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeOrganization.IOwnershipTransfer;
}): Promise<IErpHrmTimeOrganization> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        owner_member_id: true,
        deleted_at: true,
      },
    });
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization is not available", 409);
  }
  const requesterMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (requesterMembership === null || requesterMembership.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  if (organization.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
        erp_hrm_time_member_id: props.body.ownerMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (targetMembership === null) {
    throw new HttpException(
      "The target member does not belong to this organization",
      409,
    );
  }
  if (targetMembership.status !== "active") {
    throw new HttpException(
      "The target member is not eligible to become owner",
      409,
    );
  }
  if (props.body.ownerMemberId === organization.owner_member_id) {
    const current =
      await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
        where: { id: props.organizationId },
        ...ErpHrmTimeOrganizationTransformer.select(),
      });
    return await ErpHrmTimeOrganizationTransformer.transform(current);
  }
  await MyGlobal.prisma.erp_hrm_time_organizations.update({
    where: { id: props.organizationId },
    data: {
      owner_member_id: props.body.ownerMemberId,
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...ErpHrmTimeOrganizationTransformer.select(),
    });
  return await ErpHrmTimeOrganizationTransformer.transform(updated);
}
