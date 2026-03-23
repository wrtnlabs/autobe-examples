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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationLogoTransformer } from "../transformers/HrmPlatformOrganizationLogoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberOrganizationsOrganizationIdLogo(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationLogo.IUpdate;
}): Promise<IHrmPlatformOrganizationLogo> {
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingLogo =
    await MyGlobal.prisma.hrm_platform_organization_logos.findUnique({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
  let logo;
  if (existingLogo) {
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
    if (props.body.image_url === undefined) {
      throw new HttpException(
        "image_url is required when creating a new logo",
        400,
      );
    }
    logo = await MyGlobal.prisma.hrm_platform_organization_logos.create({
      data: {
        id: v4(),
        hrm_platform_organization_id: props.organizationId,
        image_url: props.body.image_url,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...HrmPlatformOrganizationLogoTransformer.select(),
    });
  }
  return await HrmPlatformOrganizationLogoTransformer.transform(logo);
}
