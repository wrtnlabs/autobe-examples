import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerOrganizationTransformer } from "../transformers/HrmTrackerOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTrackerMemberSettings(props: {
  member: MemberPayload;
  body: IHrmTrackerOrganization.ISettingsUpdate;
}): Promise<IHrmTrackerOrganization> {
  // Fetch organization owned by this member and verify owner role
  const organization =
    await MyGlobal.prisma.hrm_tracker_organizations.findFirst({
      where: {
        owner_member_id: props.member.id,
        deleted_at: null,
      },
      ...HrmTrackerOrganizationTransformer.select(),
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Update organization settings with partial update
  const updated = await MyGlobal.prisma.hrm_tracker_organizations.update({
    where: { id: organization.id },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.logo_image_uri !== undefined && {
        logo_image_uri: props.body.logo_image_uri,
      }),
      ...(props.body.currency !== undefined && {
        currency: props.body.currency,
      }),
      ...(props.body.timezone !== undefined && {
        timezone: props.body.timezone,
      }),
      ...(props.body.fiscal_start_month !== undefined && {
        fiscal_start_month: props.body.fiscal_start_month,
      }),
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    ...HrmTrackerOrganizationTransformer.select(),
  });
  return await HrmTrackerOrganizationTransformer.transform(updated);
}
