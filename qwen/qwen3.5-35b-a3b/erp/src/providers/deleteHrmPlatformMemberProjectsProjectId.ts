import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      name: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      hrm_platform_member_id: props.member.id,
      expired_at: { gt: new Date() },
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
  });
  if (session === null || session.organization_id === null) {
    throw new HttpException("Organization context required", 403);
  }
  if (project.organization_id !== session.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      project_id: props.projectId,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project with existing timelogs. Projects with time tracking history are protected from deletion.",
      409,
    );
  }
  await MyGlobal.prisma.hrm_platform_projects.delete({
    where: {
      id: props.projectId,
    },
  });
  const projectLogId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: projectLogId,
      member_id: props.member.id,
      organization_id: session.organization_id,
      entity_type: "project",
      entity_id: props.projectId,
      action_type: "delete",
      action_name: "delete_project",
      extra_data: JSON.stringify({
        project_name: project.name,
        deleted_by: props.member.id,
        organization_id: session.organization_id,
      }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmPlatformMemberProjectsProjectId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------