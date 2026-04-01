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
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        owner_member_id: true,
      },
    });
  if (organization.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated =
    await MyGlobal.prisma.erp_hrm_time_organization_settings.update({
      where: { erp_hrm_time_organization_id: props.organizationId },
      data: {
        ...(props.body.currency_code !== undefined && {
          currency_code: props.body.currency_code,
        }),
        ...(props.body.timezone !== undefined && {
          timezone: props.body.timezone,
        }),
        ...(props.body.fiscal_start_month !== undefined && {
          fiscal_start_month: props.body.fiscal_start_month,
        }),
        updated_at: new Date(),
      },
      ...ErpHrmTimeOrganizationSettingTransformer.select(),
    });
  return await ErpHrmTimeOrganizationSettingTransformer.transform(updated);
}
