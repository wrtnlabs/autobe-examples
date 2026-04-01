import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeOrganizationSettingCollector } from "../collectors/ErpHrmTimeOrganizationSettingCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationSettingTransformer } from "../transformers/ErpHrmTimeOrganizationSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberOrganizationsOrganizationIdSettings(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeOrganizationSetting.ICreate;
}): Promise<IErpHrmTimeOrganizationSetting> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
      },
      select: {
        id: true,
        owner_member_id: true,
        deleted_at: true,
      },
    });
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization is deleted", 400);
  }
  if (organization.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.erp_hrm_time_organization_settings.upsert({
    where: {
      erp_hrm_time_organization_id: props.organizationId,
    },
    create: {
      ...(await ErpHrmTimeOrganizationSettingCollector.collect({
        body: props.body,
        erpHrmTimeOrganizations: {
          id: props.organizationId,
        },
      })),
    },
    update: {
      currency_code: props.body.currencyCode,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscalStartMonth,
      updated_at: new Date(),
    },
  });
  const settings =
    await MyGlobal.prisma.erp_hrm_time_organization_settings.findUniqueOrThrow({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
      },
      ...ErpHrmTimeOrganizationSettingTransformer.select(),
    });
  return await ErpHrmTimeOrganizationSettingTransformer.transform(settings);
}
