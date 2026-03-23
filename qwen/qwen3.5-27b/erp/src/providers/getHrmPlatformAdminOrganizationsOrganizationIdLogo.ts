import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformOrganizationLogoTransformer } from "../transformers/HrmPlatformOrganizationLogoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformAdminOrganizationsOrganizationIdLogo(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformOrganizationLogo> {
  // Verify organization exists and is not soft-deleted
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  // Find the logo for the organization (must not be soft-deleted)
  const logo = await MyGlobal.prisma.hrm_platform_organization_logos.findUnique(
    {
      where: {
        hrm_platform_organization_id: props.organizationId,
        deleted_at: null,
      },
      ...HrmPlatformOrganizationLogoTransformer.select(),
    },
  );
  if (logo === null) {
    throw new HttpException("Organization logo not found", 404);
  }
  return await HrmPlatformOrganizationLogoTransformer.transform(logo);
}
