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

export async function deleteHrmPlatformMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find organization and verify it exists and is not deleted
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
    });
  // Step 2: Verify the requesting member is the organization owner
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check for pending timesheets (draft or submitted status)
  // Need to find all employees in this organization, then check their timesheets
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee: {
          organization_id: props.organizationId,
        },
        status: {
          in: ["draft", "submitted"],
        },
        deleted_at: null,
      },
    });
  if (pendingTimesheets !== null) {
    throw new HttpException(
      "Cannot delete organization: pending timesheets must be resolved (approved or rejected) first",
      400,
    );
  }
  // Step 4: Check for active employee contracts (end_date is null or in the future)
  const activeContracts =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findFirst({
      where: {
        employee: {
          organization_id: props.organizationId,
        },
        OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
        deleted_at: null,
      },
    });
  if (activeContracts !== null) {
    throw new HttpException(
      "Cannot delete organization: active employee contracts must be ended first",
      400,
    );
  }
  // Step 5: Soft delete the organization (cascade deletion handled by database)
  await MyGlobal.prisma.hrm_platform_organizations.update({
    where: {
      id: props.organizationId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
