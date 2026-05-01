import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmProject.IRequest;
}): Promise<IPageIErpHrmProject.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const insensitiveMode: Prisma.QueryMode = "insensitive";
  const whereInput = {
    organization_id: session.erp_hrm_organization_id,
    deleted_at: null,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.search
      ? { name: { contains: props.body.search, mode: insensitiveMode } }
      : {}),
  } satisfies Prisma.erp_hrm_projectsWhereInput;
  let orderByInput: Prisma.erp_hrm_projectsOrderByWithRelationInput[] = [
    { created_at: "desc" },
  ];
  if (props.body.sort && props.body.sort.length > 0) {
    const parsed: Prisma.erp_hrm_projectsOrderByWithRelationInput[] = [];
    for (let i = 0; i < props.body.sort.length; i += 2) {
      const field = props.body.sort[i];
      const rawDir = props.body.sort[i + 1]?.toUpperCase();
      const dir: "asc" | "desc" = rawDir === "ASC" ? "asc" : "desc";
      if (field === "name") {
        parsed.push({ name: dir });
      } else if (field === "created_at") {
        parsed.push({ created_at: dir });
      }
    }
    if (parsed.length > 0) {
      orderByInput = parsed;
    }
  }
  const data = await MyGlobal.prisma.erp_hrm_projects.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmProjectAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_projects.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmProjectAtSummaryTransformer.transform,
    ),
  };
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
// import { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberProjects(props: {
//   member: MemberPayload;
//   body: IErpHrmProject.IRequest;
// }): Promise<IPageIErpHrmProject.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_projects.findMany({
//     ...ErpHrmProjectAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmProjectAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------