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
import { ErpHrmTimeTrackingOrganizationTransformer } from "../transformers/ErpHrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingOrganization.IUpdate;
}): Promise<IErpHrmTimeTrackingOrganization> {
  const existing =
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findUniqueOrThrow(
      {
        where: { id: props.organizationId },
        select: { id: true, deleted_at: true },
      },
    );
  if (existing.deleted_at !== null) {
    throw new HttpException("Organization is unavailable", 404);
  }
  try {
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations.update({
      where: { id: props.organizationId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.logo_url !== undefined && {
          logo_url: props.body.logo_url,
        }),
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
    });
    const updated =
      await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findUniqueOrThrow(
        {
          where: { id: props.organizationId },
          ...ErpHrmTimeTrackingOrganizationTransformer.select(),
        },
      );
    return await ErpHrmTimeTrackingOrganizationTransformer.transform(updated);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException("Organization name already in use", 409);
    }
    throw e;
  }
}
