import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallUserBanAtSummaryTransformer } from "../transformers/EcommerceMallUserBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorBans(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallUserBan.IRequest;
}): Promise<IPageIEcommerceMallUserBan.ISummary> {
  const page: number & tags.Type<"int32"> = props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> =
    props.body.limit !== undefined ? Math.min(props.body.limit, 100) : 20;
  const skip: number = (page - 1) * limit;
  const whereConditions: Array<Prisma.ecommerce_mall_user_bansWhereInput> = [];
  if (props.body.user_type !== undefined && props.body.user_type !== "all") {
    whereConditions.push({ user_type: props.body.user_type });
  }
  if (props.body.ban_status !== undefined && props.body.ban_status !== "all") {
    whereConditions.push({
      deleted_at:
        props.body.ban_status === "active"
          ? null
          : {
              not: null,
            },
    });
  }
  if (props.body.administrator_id !== undefined) {
    whereConditions.push({
      administrator_id: props.body.administrator_id,
    });
  }
  if (props.body.banned_at_after !== undefined) {
    whereConditions.push({
      banned_at: {
        gte: props.body.banned_at_after,
      },
    });
  }
  if (props.body.banned_at_before !== undefined) {
    whereConditions.push({
      banned_at: {
        lte: props.body.banned_at_before,
      },
    });
  }
  if (props.body.created_at_after !== undefined) {
    whereConditions.push({
      created_at: {
        gte: props.body.created_at_after,
      },
    });
  }
  if (props.body.created_at_before !== undefined) {
    whereConditions.push({
      created_at: {
        lte: props.body.created_at_before,
      },
    });
  }
  if (props.body.reason_contains !== undefined) {
    whereConditions.push({
      reason: {
        contains: props.body.reason_contains,
      },
    });
  }
  const whereInput: Prisma.ecommerce_mall_user_bansWhereInput =
    whereConditions.length === 0
      ? {}
      : {
          AND: whereConditions,
        };
  const orderByCondition:
    | Prisma.ecommerce_mall_user_bansOrderByWithRelationInput
    | undefined = props.body.sort
    ? (() => {
        const parts: string[] = props.body.sort.split(":");
        const field: string = parts[0];
        const direction: "asc" | "desc" = parts[1] === "asc" ? "asc" : "desc";
        const order: Record<string, "asc" | "desc"> = { [field]: direction };
        return order as Prisma.ecommerce_mall_user_bansOrderByWithRelationInput;
      })()
    : undefined;
  const finalOrderBy:
    | Prisma.ecommerce_mall_user_bansOrderByWithRelationInput
    | undefined = orderByCondition ? orderByCondition : { banned_at: "desc" };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_user_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: finalOrderBy,
      ...EcommerceMallUserBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_user_bans.count({
      where: whereInput,
    }),
  ]);
  const data: Array<IEcommerceMallUserBan.ISummary> = await ArrayUtil.asyncMap(
    records,
    EcommerceMallUserBanAtSummaryTransformer.transform,
  );
  const pages: number & tags.Type<"int32"> =
    total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: pages satisfies number as number,
    } satisfies IPage.IPagination,
    data: data,
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
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorBans(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallUserBan.IRequest;
// }): Promise<IPageIEcommerceMallUserBan.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_user_bans.findMany({
//     ...EcommerceMallUserBanAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallUserBanAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------