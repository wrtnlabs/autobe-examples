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
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  if (session.organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        code: "project:manage",
        organization_id: session.organization_id,
        deleted_at: null,
        role: {
          deleted_at: null,
          employees: {
            some: {
              id: props.member.id,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    },
  );
  if (project.organization_id !== session.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project with existing timelogs",
      409,
    );
  }
  await MyGlobal.prisma.hrm_platform_projects.delete({
    where: {
      id: props.projectId,
    },
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: session.organization_id,
      entity_type: "project",
      entity_id: props.projectId,
      action_type: "delete",
      action_name: "delete_project",
      extra_data: null,
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