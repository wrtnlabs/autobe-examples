import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTimelogCollector } from "../collectors/ErpHrmTimeTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimelogTransformer } from "../transformers/ErpHrmTimeTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimelog.ICreate;
}): Promise<IErpHrmTimeTimelog> {
  const member = await MyGlobal.prisma.erp_hrm_time_members.findFirstOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organizations.findFirstOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const project = await MyGlobal.prisma.erp_hrm_time_projects.findFirstOrThrow({
    where: {
      id: props.body.projectId,
      erp_hrm_time_organization_id: organization.id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (project.status === "archived" || project.status === "completed") {
    throw new HttpException("Project is not available", 400);
  }
  if (props.body.taskId !== null) {
    await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
      where: {
        id: props.body.taskId,
        erp_hrm_time_project_id: project.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const created = await MyGlobal.prisma.erp_hrm_time_timelogs.create({
    data: await ErpHrmTimeTimelogCollector.collect({
      body: props.body,
      member,
    }),
    ...ErpHrmTimeTimelogTransformer.select(),
  });
  return await ErpHrmTimeTimelogTransformer.transform(created);
}
