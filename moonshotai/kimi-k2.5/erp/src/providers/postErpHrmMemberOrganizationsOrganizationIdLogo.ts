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

export async function postErpHrmMemberOrganizationsOrganizationIdLogo(props: {
  member: MemberPayload;
  organizationId: string;
  body: IErpHrmOrganization.ILogoUpload;
}): Promise<IErpHrmOrganization> {
  // Validate organization exists
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
  });
  // Update organization logo
  await MyGlobal.prisma.erp_hrm_organizations.update({
    where: { id: props.organizationId },
    data: {
      logo_url: props.body.logoUrl ?? null,
      updated_at: new Date(),
    },
  });
  // Fetch updated organization with transformer select
  const updated = await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow(
    {
      where: { id: props.organizationId },
      ...ErpHrmOrganizationTransformer.select(),
    },
  );
  // Transform and return
  return await ErpHrmOrganizationTransformer.transform(updated);
}
