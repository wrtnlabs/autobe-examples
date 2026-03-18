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
  await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findFirstOrThrow({
    where: {
      erp_hrm_time_tracking_employee_id: props.member.id,
      erp_hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const org =
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findUniqueOrThrow(
      {
        where: { id: props.organizationId },
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
      },
    );
  return {
    id: org.id,
    name: org.name,
    description: org.description,
    logo_url: org.logo_url ?? null,
    currency_code: org.currency_code,
    timezone: org.timezone,
    fiscal_start_month: org.fiscal_start_month,
    created_at: toISOStringSafe(org.created_at),
    updated_at: toISOStringSafe(org.updated_at),
    deleted_at:
      org.deleted_at === null ? null : toISOStringSafe(org.deleted_at),
  } satisfies IErpHrmTimeTrackingOrganization;
}
