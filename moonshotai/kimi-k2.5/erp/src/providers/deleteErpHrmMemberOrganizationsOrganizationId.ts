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

export async function deleteErpHrmMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string;
}): Promise<void> {
  // Verify organization exists and get owner information
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        owner_id: true,
        deleted_at: true,
      },
    });
  // Verify requesting user is the owner
  if (organization.owner_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only the organization owner can delete this organization",
      403,
    );
  }
  // Check if organization is already deleted
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization already deleted", 400);
  }
  // Check for pending timesheets - need to query through organization members
  const organizationMembers =
    await MyGlobal.prisma.erp_hrm_organization_members.findMany({
      where: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const memberIds = organizationMembers.map((m) => m.id);
  if (memberIds.length > 0) {
    const pendingTimesheets =
      await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
        where: {
          organization_member_id: { in: memberIds },
          status: "pending",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (pendingTimesheets !== null) {
      throw new HttpException(
        "Pending timesheets must be resolved before organization deletion",
        400,
      );
    }
  }
  // Check for active contracts
  const activeContracts = await MyGlobal.prisma.erp_hrm_contracts.findFirst({
    where: {
      organization_id: props.organizationId,
      is_active: true,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (activeContracts !== null) {
    throw new HttpException(
      "Active contracts must be terminated before organization deletion",
      400,
    );
  }
  // Perform soft delete
  const timestamp = new Date();
  await MyGlobal.prisma.erp_hrm_organizations.update({
    where: { id: props.organizationId },
    data: { deleted_at: timestamp },
  });
}
