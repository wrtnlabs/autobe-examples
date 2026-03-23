import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformProjectCollector } from "../collectors/HrmPlatformProjectCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectTransformer } from "../transformers/HrmPlatformProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberProjects(props: {
  member: MemberPayload;
  body: IHrmPlatformProject.ICreate;
}): Promise<IHrmPlatformProject> {
  // Get organization from member's session
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_platform_organization_id: true },
    });
  // Check if organization ID is null (required field)
  if (session.hrm_platform_organization_id === null) {
    throw new HttpException("Organization ID is required", 400);
  }
  const created = await MyGlobal.prisma.hrm_platform_projects.create({
    data: await HrmPlatformProjectCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: session.hrm_platform_organization_id },
    }),
    ...HrmPlatformProjectTransformer.select(),
  });
  return await HrmPlatformProjectTransformer.transform(created);
}
