import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerProjectCollector } from "../collectors/HrmTrackerProjectCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerProjectTransformer } from "../transformers/HrmTrackerProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerMemberProjects(props: {
  member: MemberPayload;
  body: IHrmTrackerProject.ICreate;
}): Promise<IHrmTrackerProject> {
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: { organization_id: true },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const project = await MyGlobal.prisma.hrm_tracker_projects.create({
    data: await HrmTrackerProjectCollector.collect({
      body: props.body,
      organization: { id: employee.organization_id },
    }),
    ...HrmTrackerProjectTransformer.select(),
  });
  return await HrmTrackerProjectTransformer.transform(project);
}
