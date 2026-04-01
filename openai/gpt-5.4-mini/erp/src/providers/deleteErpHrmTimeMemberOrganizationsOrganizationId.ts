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

export async function deleteErpHrmTimeMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const organization =
      await prisma.erp_hrm_time_organizations.findUniqueOrThrow({
        where: {
          id: props.organizationId,
        },
        select: {
          id: true,
          owner_member_id: true,
        },
      });
    if (organization.owner_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    const membership =
      await prisma.erp_hrm_time_organization_memberships.findFirst({
        where: {
          erp_hrm_time_member_id: props.member.id,
          erp_hrm_time_organization_id: props.organizationId,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          is_selected_context: true,
        },
      });
    if (membership === null || membership.status !== "active") {
      throw new HttpException("Forbidden", 403);
    }
    const pendingTimesheetCount = await prisma.erp_hrm_time_timesheets.count({
      where: {
        employee: {
          erp_hrm_time_organization_id: props.organizationId,
        },
        status: "submitted",
      },
    });
    if (pendingTimesheetCount > 0) {
      throw new HttpException("Organization has pending timesheets", 409);
    }
    const activeContractCount =
      await prisma.erp_hrm_time_employee_contracts.count({
        where: {
          employee: {
            erp_hrm_time_organization_id: props.organizationId,
          },
          deleted_at: null,
          end_date: null,
        },
      });
    if (activeContractCount > 0) {
      throw new HttpException(
        "Organization has active employee contracts",
        409,
      );
    }
    await prisma.erp_hrm_time_organizations.delete({
      where: {
        id: props.organizationId,
      },
    });
  });
}
