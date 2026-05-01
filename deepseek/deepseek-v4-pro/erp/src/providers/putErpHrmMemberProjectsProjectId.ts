import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectTransformer } from "../transformers/ErpHrmProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProject.IUpdate;
}): Promise<IErpHrmProject> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const existing = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: {
      id: true,
      organization_id: true,
      start_date: true,
      end_date: true,
    },
  });
  if (existing.organization_id !== session.erp_hrm_organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined && props.body.name.trim().length === 0) {
    throw new HttpException("Project name must not be empty", 400);
  }
  if (
    props.body.color_code !== undefined &&
    props.body.color_code.trim().length === 0
  ) {
    throw new HttpException("Color code must not be empty", 400);
  }
  if (
    props.body.budget_hours !== undefined &&
    props.body.budget_hours !== null &&
    props.body.budget_hours <= 0
  ) {
    throw new HttpException("Budget hours must be a positive number", 400);
  }
  const existingStartStr: (string & tags.Format<"date-time">) | null =
    existing.start_date ? toISOStringSafe(existing.start_date) : null;
  const existingEndStr: (string & tags.Format<"date-time">) | null =
    existing.end_date ? toISOStringSafe(existing.end_date) : null;
  const effectiveStartDate: (string & tags.Format<"date-time">) | null =
    props.body.start_date !== undefined
      ? props.body.start_date
      : existingStartStr;
  const effectiveEndDate: (string & tags.Format<"date-time">) | null =
    props.body.end_date !== undefined ? props.body.end_date : existingEndStr;
  if (
    effectiveStartDate !== null &&
    effectiveEndDate !== null &&
    effectiveEndDate < effectiveStartDate
  ) {
    throw new HttpException("End date must not be before start date", 400);
  }
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: {
      updated_at: new Date().toISOString(),
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.color_code !== undefined && {
        color_code: props.body.color_code,
      }),
      ...(props.body.budget_hours !== undefined && {
        budget_hours: props.body.budget_hours,
      }),
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date,
      }),
      ...(props.body.end_date !== undefined && {
        end_date: props.body.end_date,
      }),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    ...ErpHrmProjectTransformer.select(),
  });
  return await ErpHrmProjectTransformer.transform(updated);
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
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberProjectsProjectId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmProject.IUpdate;
// }): Promise<IErpHrmProject> {
//   await MyGlobal.prisma.erp_hrm_projects.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmProjectTransformer.select(),
//   });
//   return await ErpHrmProjectTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------