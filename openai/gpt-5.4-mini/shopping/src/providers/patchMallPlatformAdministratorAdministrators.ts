import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorAtSummaryTransformer } from "../transformers/MallPlatformAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformAdministrator.IRequest;
}): Promise<IPageIMallPlatformAdministrator.ISummary> {
  if (props.body.page !== undefined && props.body.page < 1) {
    throw new HttpException("Invalid page value.", 400);
  }
  if (props.body.limit !== undefined && props.body.limit < 1) {
    throw new HttpException("Invalid limit value.", 400);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_administratorsWhereInput = {
    deleted_at: null,
    ...(props.body.grade !== undefined ? { grade: props.body.grade } : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.search !== undefined && props.body.search !== ""
      ? {
          OR: [
            { email: { contains: props.body.search, mode: "insensitive" } },
            { grade: { contains: props.body.search, mode: "insensitive" } },
            { status: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_administratorsOrderByWithRelationInput[] =
    props.body.sort === "email"
      ? [{ email: "asc" }, { id: "asc" }]
      : props.body.sort === "email_desc"
        ? [{ email: "desc" }, { id: "desc" }]
        : props.body.sort === "grade"
          ? [{ grade: "asc" }, { id: "asc" }]
          : props.body.sort === "grade_desc"
            ? [{ grade: "desc" }, { id: "desc" }]
            : props.body.sort === "status"
              ? [{ status: "asc" }, { id: "asc" }]
              : props.body.sort === "status_desc"
                ? [{ status: "desc" }, { id: "desc" }]
                : [{ created_at: "desc" }, { id: "desc" }];
  const records = await MyGlobal.prisma.mall_platform_administrators.findMany({
    ...MallPlatformAdministratorAtSummaryTransformer.select(),
    where,
    orderBy,
    skip,
    take: limit,
  });
  const total: number =
    await MyGlobal.prisma.mall_platform_administrators.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformAdministratorAtSummaryTransformer.transform,
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
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// import { IPageIMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministrator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorAdministrators(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformAdministrator.IRequest;
// }): Promise<IPageIMallPlatformAdministrator.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_administrators.findMany({
//     ...MallPlatformAdministratorAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformAdministratorAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------