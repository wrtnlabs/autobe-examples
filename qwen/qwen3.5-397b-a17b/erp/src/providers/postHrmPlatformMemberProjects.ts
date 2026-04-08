import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirstOrThrow(
      {
        where: {
          hrm_platform_member_id: props.member.id,
          deleted_at: null,
        },
        select: {
          hrm_platform_organization_id: true,
        },
      },
    );
  const created = await MyGlobal.prisma.hrm_platform_projects.create({
    data: await HrmPlatformProjectCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: {
        id: membership.hrm_platform_organization_id,
      },
    }),
    ...HrmPlatformProjectTransformer.select(),
  });
  return await HrmPlatformProjectTransformer.transform(created);
}
