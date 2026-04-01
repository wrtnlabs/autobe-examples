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
  // Verify organization exists and is not deleted
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  // Verify member is the organization owner
  const ownerRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      hrm_platform_organization_id: props.organizationId,
      code: "owner",
      deleted_at: null,
    },
  });
  if (!ownerRole) {
    throw new HttpException("Forbidden", 403);
  }
  const isOwner = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_organization_id: props.organizationId,
      hrm_platform_user_id: props.member.id,
      hrm_platform_role_id: ownerRole.id,
      deleted_at: null,
    },
  });
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for pending timesheets (draft or submitted status)
  const pendingTimesheets = await MyGlobal.prisma.hrm_platform_timesheets.count(
    {
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
        status: {
          in: ["draft", "submitted"],
        },
        deleted_at: null,
      },
    },
  );
  if (pendingTimesheets > 0) {
    throw new HttpException(
      "Cannot delete organization with pending timesheets",
      409,
    );
  }
  // Check for active contracts (end_date is null means ongoing)
  const activeContracts = await MyGlobal.prisma.hrm_platform_contracts.count({
    where: {
      employee: {
        hrm_platform_organization_id: props.organizationId,
      },
      end_date: null,
      deleted_at: null,
    },
  });
  if (activeContracts > 0) {
    throw new HttpException(
      "Cannot delete organization with active contracts",
      409,
    );
  }
  // Delete organization (cascade handles all related data)
  await MyGlobal.prisma.hrm_platform_organizations.delete({
    where: {
      id: props.organizationId,
    },
  });
}
