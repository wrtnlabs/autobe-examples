import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationTransformer } from "../transformers/ErpHrmOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmOrganization.IUpdate;
}): Promise<IErpHrmOrganization> {
  // Fetch organization with owner info for authorization check
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
      },
    });
  // Authorization: Only organization owner can modify settings
  if (organization.owner_id !== props.member.id) {
    throw new HttpException(
      "Only the organization owner can modify organization settings",
      403,
    );
  }
  // If name is being updated, check uniqueness across all active organizations
  if (props.body.name !== undefined && props.body.name !== organization.name) {
    const existingOrg = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        NOT: {
          id: props.organizationId,
        },
      },
    });
    if (existingOrg !== null) {
      throw new HttpException("Organization name must be unique", 409);
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.erp_hrm_organizationsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.logo_image !== undefined && {
      logo_image: props.body.logo_image,
    }),
    ...(props.body.currency !== undefined && { currency: props.body.currency }),
    ...(props.body.timezone !== undefined && { timezone: props.body.timezone }),
    ...(props.body.fiscal_start_month !== undefined && {
      fiscal_start_month: props.body.fiscal_start_month,
    }),
    updated_at: new Date(),
  };
  // Update the organization
  await MyGlobal.prisma.erp_hrm_organizations.update({
    where: { id: props.organizationId },
    data: updateData,
  });
  // Fetch and transform the updated organization
  const updated = await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow(
    {
      where: { id: props.organizationId },
      ...ErpHrmOrganizationTransformer.select(),
    },
  );
  return await ErpHrmOrganizationTransformer.transform(updated);
}
