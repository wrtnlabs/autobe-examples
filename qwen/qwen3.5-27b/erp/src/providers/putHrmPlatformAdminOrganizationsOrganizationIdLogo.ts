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

export async function putHrmPlatformAdminOrganizationsOrganizationIdLogo(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationLogo.IUpdate;
}): Promise<IHrmPlatformOrganizationLogo> {
  // Verify organization exists and is not soft-deleted
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  // Check if logo exists for this organization
  const existingLogo =
    await MyGlobal.prisma.hrm_platform_organization_logos.findUnique({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
  let logo;
  if (existingLogo && existingLogo.deleted_at === null) {
    // Update existing logo
    logo = await MyGlobal.prisma.hrm_platform_organization_logos.update({
      where: {
        id: existingLogo.id,
      },
      data: {
        image_url: props.body.image_url ?? existingLogo.image_url,
        updated_at: new Date(),
      },
      ...HrmPlatformOrganizationLogoTransformer.select(),
    });
  } else {
    // Create new logo
    logo = await MyGlobal.prisma.hrm_platform_organization_logos.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        hrm_platform_organization_id: props.organizationId,
        image_url: props.body.image_url ?? "",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...HrmPlatformOrganizationLogoTransformer.select(),
    });
  }
  return await HrmPlatformOrganizationLogoTransformer.transform(logo);
}
