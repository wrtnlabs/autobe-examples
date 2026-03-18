import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Query member's current organization through employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException(
      "Member is not associated with any organization",
      403,
    );
  }
  // Create project using collector
  const created = await MyGlobal.prisma.hrm_platform_projects.create({
    data: await HrmPlatformProjectCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: {
        id: employee.hrm_platform_organization_id,
      } as any,
    }),
    ...HrmPlatformProjectTransformer.select(),
  });
  return await HrmPlatformProjectTransformer.transform(created);
}
