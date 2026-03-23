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

export async function deleteHrmTrackerMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string;
}): Promise<void> {
  const organization =
    await MyGlobal.prisma.hrm_tracker_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, owner_member_id: true },
    });
  if (organization.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_tracker_timesheets.findFirst({
      where: {
        hrm_tracker_organization_id: props.organizationId,
        status: "pending" as const,
      },
      select: { id: true },
    });
  if (pendingTimesheets) {
    throw new HttpException(
      "Cannot delete organization with pending timesheets",
      400,
    );
  }
  const activeContracts =
    await MyGlobal.prisma.hrm_tracker_employee_contracts.findFirst({
      where: {
        hrm_tracker_employee_id: props.organizationId,
        end_date: null,
      },
      select: { id: true },
    });
  if (activeContracts) {
    throw new HttpException(
      "Cannot delete organization with active employee contracts",
      400,
    );
  }
  const pendingInvitations =
    await MyGlobal.prisma.hrm_tracker_pending_invitations.findFirst({
      where: {
        organization_id: props.organizationId,
      },
      select: { id: true },
    });
  if (pendingInvitations) {
    throw new HttpException(
      "Cannot delete organization with pending invitations",
      400,
    );
  }
  await MyGlobal.prisma.hrm_tracker_organizations.delete({
    where: { id: props.organizationId },
  });
}
