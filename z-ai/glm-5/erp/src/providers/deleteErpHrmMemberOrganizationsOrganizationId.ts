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
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Authorization Check - verify ownership
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findUnique({
    where: { id: props.organizationId },
    select: { id: true, owner_id: true, deleted_at: true },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization not found", 404);
  }
  if (organization.owner_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - only the organization owner can delete this organization",
      403,
    );
  }
  // 2. Pre-deletion Validation - Check pending timesheets
  const pendingTimesheets = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      employee: {
        erp_hrm_organization_id: props.organizationId,
      },
      status: { in: ["draft", "submitted"] },
    },
  });
  if (pendingTimesheets !== null) {
    throw new HttpException(
      "Cannot delete organization: all timesheets must be approved or rejected before deletion. Please resolve pending timesheets first.",
      400,
    );
  }
  // 3. Pre-deletion Validation - Check active contracts
  const now = new Date();
  const activeContracts = await MyGlobal.prisma.erp_hrm_contracts.findFirst({
    where: {
      employee: {
        erp_hrm_organization_id: props.organizationId,
      },
      OR: [{ end_date: null }, { end_date: { gt: now } }],
    },
  });
  if (activeContracts !== null) {
    throw new HttpException(
      "Cannot delete organization: all employee contracts must be ended before deletion. Please terminate active contracts first.",
      400,
    );
  }
  // 4. Soft delete the organization
  await MyGlobal.prisma.erp_hrm_organizations.update({
    where: { id: props.organizationId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
