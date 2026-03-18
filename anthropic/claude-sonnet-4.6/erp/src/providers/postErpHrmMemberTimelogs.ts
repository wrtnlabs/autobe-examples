import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimelogCollector } from "../collectors/ErpHrmTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimelogTransformer } from "../transformers/ErpHrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.ICreate;
}): Promise<IErpHrmTimelog> {
  // Step 1: Validate project exists, is not deleted, and is active
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.body.project_id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found or has been deleted.", 404);
  }
  if (project.status !== "active") {
    throw new HttpException(
      "Cannot log time on a project that is not active (archived or completed).",
      400,
    );
  }
  // Step 2: Resolve the organization member record for the authenticated member
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException(
      "You are not a member of the organization that owns this project.",
      403,
    );
  }
  if (orgMember.status !== "active") {
    throw new HttpException("Deactivated members cannot log time.", 403);
  }
  // Step 3: Validate active project membership
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: props.body.project_id,
        organization_member_id: orgMember.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (projectMembership === null) {
    throw new HttpException(
      "You are not an active member of the specified project.",
      403,
    );
  }
  // Step 4: If task_id provided, validate task belongs to the same project and is not deleted
  if (props.body.task_id != null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.task_id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_project_id: true,
      },
    });
    if (task === null) {
      throw new HttpException(
        "The specified task does not exist or has been deleted.",
        404,
      );
    }
    if (task.erp_hrm_project_id !== props.body.project_id) {
      throw new HttpException(
        "The specified task does not belong to the given project.",
        400,
      );
    }
  }
  // Step 5: Create the timelog using the collector + transformer
  const created = await MyGlobal.prisma.erp_hrm_timelogs.create({
    data: await ErpHrmTimelogCollector.collect({
      body: props.body,
      erpHrmOrganizationMembers: { id: orgMember.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmTimelogTransformer.select(),
  });
  return ErpHrmTimelogTransformer.transform(created);
}
