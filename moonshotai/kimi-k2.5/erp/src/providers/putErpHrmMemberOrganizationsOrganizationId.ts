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
  // Find organization and verify it exists (404 if not found)
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, owner_id: true },
    });
  // Verify ownership - only owner can update organization
  if (organization.owner_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - only organization owner can update",
      403,
    );
  }
  // Perform partial update with only provided fields
  await MyGlobal.prisma.erp_hrm_organizations.update({
    where: { id: props.organizationId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.currency !== undefined && {
        currency: props.body.currency,
      }),
      ...(props.body.timezone !== undefined && {
        timezone: props.body.timezone,
      }),
      ...(props.body.fiscalYearStartMonth !== undefined && {
        fiscal_year_start_month: props.body.fiscalYearStartMonth,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch updated organization with full relations for transformation
  const updated = await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow(
    {
      where: { id: props.organizationId },
      ...ErpHrmOrganizationTransformer.select(),
    },
  );
  return await ErpHrmOrganizationTransformer.transform(updated);
}
