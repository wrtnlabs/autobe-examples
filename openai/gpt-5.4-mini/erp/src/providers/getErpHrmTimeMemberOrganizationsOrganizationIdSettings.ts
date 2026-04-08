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

export async function getErpHrmTimeMemberOrganizationsOrganizationIdSettings(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeOrganizationSetting> {
  await MyGlobal.prisma.erp_hrm_time_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
      organizationMemberships: {
        some: {
          erp_hrm_time_member_id: props.member.id,
          deleted_at: null,
        },
      },
    },
    select: {
      id: true,
    },
  });
  const record =
    await MyGlobal.prisma.erp_hrm_time_organization_settings.findUniqueOrThrow({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
      },
      ...ErpHrmTimeOrganizationSettingTransformer.select(),
    });
  return await ErpHrmTimeOrganizationSettingTransformer.transform(record);
}
