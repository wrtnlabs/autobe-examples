import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationSettingTransformer } from "../transformers/ErpHrmTimeOrganizationSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberOrganizationsOrganizationIdSettings(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeOrganizationSetting.IUpdate;
}): Promise<IErpHrmTimeOrganizationSetting> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organizations.findUnique({
      where: {
        id: props.organizationId,
      },
      select: {
        id: true,
        owner_member_id: true,
      },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  if (organization.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const current =
    await MyGlobal.prisma.erp_hrm_time_organization_settings.findUnique({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
      },
    });
  if (current === null) {
    throw new HttpException("Organization settings not found", 404);
  }
  const updated =
    await MyGlobal.prisma.erp_hrm_time_organization_settings.update({
      where: {
        id: current.id,
      },
      data: {
        ...(props.body.currencyCode !== undefined
          ? { currency_code: props.body.currencyCode }
          : {}),
        ...(props.body.timezone !== undefined
          ? { timezone: props.body.timezone }
          : {}),
        ...(props.body.fiscalStartMonth !== undefined
          ? { fiscal_start_month: props.body.fiscalStartMonth }
          : {}),
      },
      ...ErpHrmTimeOrganizationSettingTransformer.select(),
    });
  return await ErpHrmTimeOrganizationSettingTransformer.transform(updated);
}
