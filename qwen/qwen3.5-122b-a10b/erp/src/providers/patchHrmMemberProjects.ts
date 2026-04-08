import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmProjectAtSummaryTransformer } from "../transformers/HrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberProjects(props: {
  member: MemberPayload;
  body: IHrmProject.IRequest;
}): Promise<IPageIHrmProject.ISummary> {
  // Get organization context from member's employee record
  const employee = await MyGlobal.prisma.hrm_employees.findFirstOrThrow({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  // Build pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where filter for organization-scoped projects
  const whereInput: Prisma.hrm_projectsWhereInput = {
    hrm_organization_id: employee.organization_id,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.start_date_from !== undefined && {
      start_date: {
        gte: props.body.start_date_from,
      },
    }),
    ...(props.body.start_date_to !== undefined && {
      start_date: {
        lte: props.body.start_date_to,
      },
    }),
    ...(props.body.end_date_from !== undefined && {
      end_date: {
        gte: props.body.end_date_from,
      },
    }),
    ...(props.body.end_date_to !== undefined && {
      end_date: {
        lte: props.body.end_date_to,
      },
    }),
  } satisfies Prisma.hrm_projectsWhereInput;
  // Build order by with default fallback
  const orderByInput: Prisma.hrm_projectsOrderByWithRelationInput =
    props.body.sort_by !== undefined && props.body.sort_order !== undefined
      ? typia.createIs<Prisma.hrm_projectsOrderByWithRelationInput>()({
          [props.body.sort_by]: props.body.sort_order,
        })
        ? typia.assert<Prisma.hrm_projectsOrderByWithRelationInput>({
            [props.body.sort_by]: props.body.sort_order,
          })
        : { created_at: "desc" }
      : { created_at: "desc" };
  // Get paginated data and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_projects.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmProjectAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_projects.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmProjectAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmProject.ISummary;
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
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IPageIHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProject";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberProjects(props: {
//   member: MemberPayload;
//   body: IHrmProject.IRequest;
// }): Promise<IPageIHrmProject.ISummary> {
//   const records = await MyGlobal.prisma.hrm_projects.findMany({
//     ...HrmProjectAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmProjectAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------