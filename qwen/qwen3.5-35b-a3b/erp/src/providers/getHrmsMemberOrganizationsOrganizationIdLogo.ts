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
  // Check if user is a member of this organization
  const memberConnection =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: props.organizationId,
      },
    });
  if (memberConnection === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query organization with logo_uri
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmsOrganizationLogoTransformer.select(),
    });
  return await HrmsOrganizationLogoTransformer.transform(organization);
}
