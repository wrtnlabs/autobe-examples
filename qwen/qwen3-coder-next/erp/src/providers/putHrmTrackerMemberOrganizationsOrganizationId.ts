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

export async function putHrmTrackerMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string;
  body: IHrmTrackerOrganization.IUpdate;
}): Promise<IHrmTrackerOrganization> {
  // Fetch current organization
  const current =
    await MyGlobal.prisma.hrm_tracker_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        owner_member_id: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Verify ownership
  if (current.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate status - cannot update deleted organization
  if (current.status === "deleted") {
    throw new HttpException("Organization is deleted", 400);
  }
  // Prepare update data with updated_at
  const updateData: any = { updated_at: new Date() };
  // Handle name field with unique constraint check
  if (props.body.name !== undefined && props.body.name !== current.name) {
    const existing = await MyGlobal.prisma.hrm_tracker_organizations.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.organizationId },
        deleted_at: null,
      },
    });
    if (existing) {
      throw new HttpException("Organization name already in use", 409);
    }
    updateData.name = props.body.name;
  }
  // Apply other provided fields
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.logo_image_uri !== undefined) {
    updateData.logo_image_uri = props.body.logo_image_uri;
  }
  if (props.body.currency !== undefined) {
    updateData.currency = props.body.currency;
  }
  if (props.body.timezone !== undefined) {
    updateData.timezone = props.body.timezone;
  }
  if (props.body.fiscal_start_month !== undefined) {
    updateData.fiscal_start_month = props.body.fiscal_start_month;
  }
  // Update organization
  const updated = await MyGlobal.prisma.hrm_tracker_organizations.update({
    where: { id: props.organizationId },
    data: updateData,
    ...HrmTrackerOrganizationTransformer.select(),
  });
  return await HrmTrackerOrganizationTransformer.transform(updated);
}
