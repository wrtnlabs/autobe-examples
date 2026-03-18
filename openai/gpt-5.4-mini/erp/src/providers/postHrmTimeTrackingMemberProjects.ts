import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingProjectCollector } from "../collectors/HrmTimeTrackingProjectCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingProjectTransformer } from "../transformers/HrmTimeTrackingProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberProjects(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingProject.ICreate;
}): Promise<IHrmTimeTrackingProject> {
  const duplicated = await MyGlobal.prisma.hrm_time_tracking_projects.findFirst(
    {
      where: {
        organization_id: props.member.id,
        name: props.body.name,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (duplicated !== null) {
    throw new HttpException("Project name already exists", 409);
  }
  const created = await MyGlobal.prisma.hrm_time_tracking_projects.create({
    data: await HrmTimeTrackingProjectCollector.collect({
      body: props.body,
      organization: {
        id: props.member.id,
      },
    }),
    ...HrmTimeTrackingProjectTransformer.select(),
  });
  return await HrmTimeTrackingProjectTransformer.transform(created);
}
