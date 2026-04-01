import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
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

export async function getErpHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingOrganization> {
  const memberId = props.member.id;
  const accessible =
    await MyGlobal.prisma.erp_hrm_time_tracking_project_memberships.findFirst({
      where: {
        deleted_at: null,
        employee_id: memberId,
        project: {
          deleted_at: null,
          erp_hrm_time_tracking_organization_id: props.organizationId,
        },
      },
      select: { id: true },
    });
  if (accessible === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organization =
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        currency_code: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: organization.id,
    name: organization.name,
    description: organization.description,
    logo_url: organization.logo_url,
    currency_code: organization.currency_code,
    timezone: organization.timezone,
    fiscal_start_month: organization.fiscal_start_month,
    created_at: organization.created_at.toISOString(),
    updated_at: organization.updated_at.toISOString(),
    deleted_at: organization.deleted_at?.toISOString() ?? null,
  };
}
