import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmProjectCollector } from "../collectors/ErpHrmProjectCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminProjects(props: {
  admin: AdminPayload;
  body: IErpHrmProject.ICreate;
}): Promise<IErpHrmProject.ISummary> {
  // Validate session exists
  await MyGlobal.prisma.erp_hrm_admin_sessions.findUniqueOrThrow({
    where: { id: props.admin.session_id },
  });
  // Find existing project to extract organization context
  // Admin must belong to an organization to create projects
  const existingProject = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {},
    select: {
      erp_hrm_organization_id: true,
    },
    take: 1,
  });
  if (!existingProject) {
    throw new HttpException(
      "Cannot create project: no organization context available",
      400,
    );
  }
  // Check for duplicate project name (case-insensitive) within organization
  const duplicateProject = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      erp_hrm_organization_id: existingProject.erp_hrm_organization_id,
      name: { equals: props.body.name, mode: "insensitive" },
    },
  });
  if (duplicateProject) {
    throw new HttpException(
      "Project with this name already exists in the organization",
      409,
    );
  }
  // Build organization entity for collector
  const organizationEntity: IEntity = {
    id: existingProject.erp_hrm_organization_id as string & tags.Format<"uuid">,
  };
  // Create project using collector
  const created = await MyGlobal.prisma.erp_hrm_projects.create({
    data: await ErpHrmProjectCollector.collect({
      body: props.body,
      erpHrmOrganizations: organizationEntity,
    }),
    ...ErpHrmProjectAtSummaryTransformer.select(),
  });
  // Transform and return response
  return await ErpHrmProjectAtSummaryTransformer.transform(created);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminProjects(props: {
//   admin: AdminPayload;
//   body: IErpHrmProject.ICreate;
// }): Promise<IErpHrmProject> {
//   await MyGlobal.prisma.erp_hrm_projects.create({
//     data: await ErpHrmProjectCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------