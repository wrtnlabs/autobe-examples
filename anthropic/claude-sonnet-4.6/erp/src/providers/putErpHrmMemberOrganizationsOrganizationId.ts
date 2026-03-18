import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
  // Step 1: Find the organization (404 if not found or soft-deleted)
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_member_id: true,
      },
    });
  // Step 2: Authorization - only the Owner may update organization settings
  if (organization.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: If name is being updated, check global uniqueness (exclude current org)
  if (props.body.name !== undefined) {
    const conflicting = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        id: { not: props.organizationId },
      },
      select: { id: true },
    });
    if (conflicting !== null) {
      throw new HttpException(
        "Conflict: organization name already in use",
        409,
      );
    }
  }
  // Step 4: Apply the update
  await MyGlobal.prisma.erp_hrm_organizations.update({
    where: { id: props.organizationId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.logo_url !== undefined && {
        logo_url: props.body.logo_url,
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
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch and return the fully updated organization record via transformer
  const updated = await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    ...ErpHrmOrganizationTransformer.select(),
  });
  return ErpHrmOrganizationTransformer.transform(updated);
}
