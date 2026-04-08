import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSellers(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformSeller.IRequest;
}): Promise<IPageIMallPlatformSeller.ISummary> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_sellersWhereInput = {
    ...(props.body.search !== undefined && {
      OR: [
        { email: { contains: props.body.search, mode: "insensitive" } },
        {
          rejection_reason: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.email !== undefined && { email: props.body.email }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.rejection_reason !== undefined && {
      rejection_reason: {
        contains: props.body.rejection_reason,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: props.body.created_at_to },
    }),
    ...(props.body.updated_at_from !== undefined && {
      updated_at: { gte: props.body.updated_at_from },
    }),
    ...(props.body.updated_at_to !== undefined && {
      updated_at: { lte: props.body.updated_at_to },
    }),
    ...(props.body.deleted_at_from !== undefined &&
      (props.body.deleted_at_from === null
        ? { deleted_at: null }
        : { deleted_at: { gte: props.body.deleted_at_from } })),
    ...(props.body.deleted_at_to !== undefined &&
      (props.body.deleted_at_to === null
        ? { deleted_at: null }
        : { deleted_at: { lte: props.body.deleted_at_to } })),
  };
  const orderBy: Prisma.mall_platform_sellersOrderByWithRelationInput =
    props.body.sort === undefined || props.body.sort === "created_at"
      ? { created_at: props.body.order ?? "desc" }
      : props.body.sort === "updated_at"
        ? { updated_at: props.body.order ?? "desc" }
        : props.body.sort === "deleted_at"
          ? { deleted_at: props.body.order ?? "desc" }
          : props.body.sort === "email"
            ? { email: props.body.order ?? "asc" }
            : props.body.sort === "status"
              ? { status: props.body.order ?? "asc" }
              : props.body.sort === "rejection_reason"
                ? { rejection_reason: props.body.order ?? "asc" }
                : (() => {
                    throw new HttpException("Unknown sort key", 400);
                  })();
  const records = await MyGlobal.prisma.mall_platform_sellers.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      email: true,
      status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.mall_platform_sellers.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map(
      (record) =>
        ({
          id: record.id,
          email: record.email,
          status: record.status,
          rejectionReason: record.rejection_reason,
          createdAt: record.created_at.toISOString(),
          updatedAt: record.updated_at.toISOString(),
          deletedAt:
            record.deleted_at === null ? null : record.deleted_at.toISOString(),
        }) satisfies IMallPlatformSeller.ISummary,
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
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorSellers(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformSeller.IRequest;
// }): Promise<IPageIMallPlatformSeller.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_sellers.findMany({
//     ...MallPlatformSellerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformSellerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------