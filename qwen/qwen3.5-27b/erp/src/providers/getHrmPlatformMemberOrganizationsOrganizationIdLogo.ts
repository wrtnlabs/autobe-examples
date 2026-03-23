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

export async function getHrmPlatformMemberOrganizationsOrganizationIdLogo(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformOrganizationLogo> {
  // Verify organization exists and is not soft-deleted
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Verify member has access to the organization through their session
  const memberSession =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
      where: {
        id: props.member.session_id,
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: props.organizationId,
      },
    });
  if (memberSession === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the organization logo
  const logo =
    await MyGlobal.prisma.hrm_platform_organization_logos.findUniqueOrThrow({
      where: {
        hrm_platform_organization_id: props.organizationId,
        deleted_at: null,
      },
      ...HrmPlatformOrganizationLogoTransformer.select(),
    });
  return await HrmPlatformOrganizationLogoTransformer.transform(logo);
}
