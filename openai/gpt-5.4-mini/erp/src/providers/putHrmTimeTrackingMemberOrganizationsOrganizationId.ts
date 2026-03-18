import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganization.IUpdate;
}): Promise<IHrmTimeTrackingOrganization> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (organization.deleted_at !== null)
    throw new HttpException("Forbidden", 403);
  if (props.body.name !== undefined) {
    const duplicated =
      await MyGlobal.prisma.hrm_time_tracking_organizations.findFirst({
        where: {
          name: props.body.name.trim(),
          id: { not: props.organizationId },
        },
        select: {
          id: true,
        },
      });
    if (duplicated !== null)
      throw new HttpException("Organization name already exists", 409);
  }
  const updated = await MyGlobal.prisma.hrm_time_tracking_organizations.update({
    where: { id: props.organizationId },
    data: {
      ...(props.body.name !== undefined
        ? { name: props.body.name.trim() }
        : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.logoImageUrl !== undefined
        ? { logo_image_url: props.body.logoImageUrl }
        : {}),
      ...(props.body.currency !== undefined
        ? { currency: props.body.currency }
        : {}),
      ...(props.body.timezone !== undefined
        ? { timezone: props.body.timezone }
        : {}),
      ...(props.body.fiscalStartMonth !== undefined
        ? { fiscal_start_month: props.body.fiscalStartMonth }
        : {}),
      updated_at: new Date(),
    },
    ...HrmTimeTrackingOrganizationTransformer.select(),
  });
  return await HrmTimeTrackingOrganizationTransformer.transform(updated);
}
