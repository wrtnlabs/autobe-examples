import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminProjectsProjectIdMembers(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IRequest;
}): Promise<IPageIErpHrmProjectMember.ISummary> {
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true },
  });
  const createdAtRange = {
    ...(props.body.createdAtStart !== undefined && {
      gte: new Date(props.body.createdAtStart),
    }),
    ...(props.body.createdAtEnd !== undefined && {
      lte: new Date(props.body.createdAtEnd),
    }),
  } satisfies {
    gte?: Date;
    lte?: Date;
  };
  const whereConditions: Prisma.erp_hrm_project_membersWhereInput = {
    erp_hrm_project_id: props.projectId,
    ...(props.body.assignedRole !== undefined && {
      assigned_role: props.body.assignedRole,
    }),
    ...(props.body.employeeStatus !== undefined && {
      employee: {
        status: props.body.employeeStatus,
      },
    }),
    ...(props.body.employeeSearch !== undefined && {
      employee: {
        member: {
          OR: [
            {
              display_name: {
                contains: props.body.employeeSearch,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: props.body.employeeSearch,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    }),
    ...(Object.keys(createdAtRange).length > 0 && {
      created_at: createdAtRange,
    }),
  };
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const totalCount = await MyGlobal.prisma.erp_hrm_project_members.count({
    where: whereConditions,
  });
  const projectMembers = await MyGlobal.prisma.erp_hrm_project_members.findMany(
    {
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        assigned_role: true,
        created_at: true,
        updated_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
      },
    },
  );
  const data = await ArrayUtil.asyncMap(projectMembers, async (pm) =>
    typia.assert<IErpHrmProjectMember.ISummary>({
      id: pm.id as string & tags.Format<"uuid">,
      assignedRole: pm.assigned_role as "member" | "project_lead",
      createdAt: toISOStringSafe(pm.created_at),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(pm.employee),
    }),
  );
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: totalCount as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(totalCount / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIErpHrmProjectMember.ISummary;
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
// import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
// import { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdminProjectsProjectIdMembers(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmProjectMember.IRequest;
// }): Promise<IPageIErpHrmProjectMember.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------