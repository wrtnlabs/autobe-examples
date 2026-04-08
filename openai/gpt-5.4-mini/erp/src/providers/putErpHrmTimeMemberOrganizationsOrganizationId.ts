import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeOrganizationDashboardSummaryTransformer } from "../transformers/ErpHrmTimeOrganizationDashboardSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeOrganizationDashboardSummary.IUpdate;
}): Promise<IErpHrmTimeOrganizationDashboardSummary> {
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
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_organizations.update({
      where: { id: props.organizationId },
      data: {
        ...(props.body.name !== undefined ? { name: props.body.name } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.logoImageUrl !== undefined
          ? { logo_image_url: props.body.logoImageUrl }
          : {}),
        updated_at: new Date(),
      },
    });
    const existingSetting =
      await prisma.erp_hrm_time_organization_settings.findUnique({
        where: { erp_hrm_time_organization_id: props.organizationId },
        select: { id: true },
      });
    if (existingSetting === null) {
      if (
        props.body.currencyCode === undefined ||
        props.body.timezone === undefined ||
        props.body.fiscalStartMonth === undefined
      ) {
        throw new HttpException("Organization settings not initialized", 404);
      }
      await prisma.erp_hrm_time_organization_settings.create({
        data: {
          id: v4(),
          erp_hrm_time_organization_id: props.organizationId,
          currency_code: props.body.currencyCode,
          timezone: props.body.timezone,
          fiscal_start_month: props.body.fiscalStartMonth,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    } else {
      await prisma.erp_hrm_time_organization_settings.update({
        where: { erp_hrm_time_organization_id: props.organizationId },
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
          updated_at: new Date(),
        },
      });
    }
    return await prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...ErpHrmTimeOrganizationDashboardSummaryTransformer.select(),
    });
  });
  return await ErpHrmTimeOrganizationDashboardSummaryTransformer.transform(
    updated,
  );
}
