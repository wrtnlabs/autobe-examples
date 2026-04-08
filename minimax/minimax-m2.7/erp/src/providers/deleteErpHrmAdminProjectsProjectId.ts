import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmAdminProjectsProjectId(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check for timelogs constraint - cannot delete project with time entries
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: { erp_hrm_project_id: props.projectId },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Project cannot be deleted because it contains time entries. Consider archiving the project instead.",
      409,
    );
  }
  // Verify project exists and get organization context
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  // Delete tasks belonging to the project
  await MyGlobal.prisma.erp_hrm_tasks.deleteMany({
    where: { erp_hrm_project_id: props.projectId },
  });
  // Delete project members
  await MyGlobal.prisma.erp_hrm_project_members.deleteMany({
    where: { erp_hrm_project_id: props.projectId },
  });
  // Delete the project
  await MyGlobal.prisma.erp_hrm_projects.delete({
    where: { id: props.projectId },
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
// export async function deleteErpHrmAdminProjectsProjectId(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------