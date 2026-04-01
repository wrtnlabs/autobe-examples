import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationLogo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsOrganizationLogoTransformer } from "../transformers/HrmsOrganizationLogoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberOrganizationsOrganizationIdLogo(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmsOrganizationLogo> {
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      include: {
        owner: true,
        memberSessions: true,
        activityLogs: true,
        organizationMembers: true,
        roles: true,
        departments: true,
        projects: true,
        files: true,
        fileUploads: true,
      },
    });
  const memberOrg = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      organization: {
        is: { id: props.organizationId },
      },
      member: {
        is: { id: props.member.id },
      },
      deleted_at: null,
    },
  });
  if (memberOrg === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmsOrganizationLogoTransformer.transform(organization);
}
