import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTaskCollector } from "../collectors/HrmPlatformTaskCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformTaskTransformer } from "../transformers/HrmPlatformTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAdminProjectsProjectIdTasks(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformTask.ICreate;
}): Promise<IHrmPlatformTask> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { id: true },
    },
  );
  const adminRecord =
    await MyGlobal.prisma.hrm_platform_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true },
    });
  const member = await MyGlobal.prisma.hrm_platform_members.findFirstOrThrow({
    where: {
      id: adminRecord.id,
    },
    select: { id: true },
  });
  const created = await MyGlobal.prisma.hrm_platform_tasks.create({
    data: await HrmPlatformTaskCollector.collect({
      body: props.body,
      hrmPlatformProjects: project,
      hrmPlatformMembers: member,
    }),
    ...HrmPlatformTaskTransformer.select(),
  });
  return await HrmPlatformTaskTransformer.transform(created);
}
