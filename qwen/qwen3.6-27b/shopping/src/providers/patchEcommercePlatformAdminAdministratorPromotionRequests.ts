import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer } from "../transformers/EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformAdminAdministratorPromotionRequests(props: {
  admin: AdminPayload;
  body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
}): Promise<IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClauses: Prisma.ecommerce_platform_administrator_promotion_requestsWhereInput[] =
    [];
  if (props.body.actor_type !== undefined && props.body.actor_type !== null) {
    whereClauses.push({ actor_type: props.body.actor_type });
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    whereClauses.push({ status: props.body.status });
  }
  if (props.body.reviewed !== undefined && props.body.reviewed !== null) {
    whereClauses.push({
      reviewed_at: props.body.reviewed ? { not: null } : null,
    });
  }
  if (
    props.body.reviewed_by_admin_id !== undefined &&
    props.body.reviewed_by_admin_id !== null
  ) {
    whereClauses.push({
      reviewed_by_admin_id: props.body.reviewed_by_admin_id,
    });
  }
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    whereClauses.push({ created_at: { gte: props.body.created_at_from } });
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    whereClauses.push({ created_at: { lte: props.body.created_at_to } });
  }
  if (
    props.body.reviewed_at_from !== undefined &&
    props.body.reviewed_at_from !== null
  ) {
    whereClauses.push({ reviewed_at: { gte: props.body.reviewed_at_from } });
  }
  if (
    props.body.reviewed_at_to !== undefined &&
    props.body.reviewed_at_to !== null
  ) {
    whereClauses.push({ reviewed_at: { lte: props.body.reviewed_at_to } });
  }
  if (props.body.search !== undefined && props.body.search !== null) {
    whereClauses.push({
      OR: [
        { reason: { contains: props.body.search } },
        { rejection_reason: { contains: props.body.search } },
      ],
    });
  }
  const whereInput = whereClauses.length > 0 ? { AND: whereClauses } : {};
  const orderByInput =
    ((): Prisma.ecommerce_platform_administrator_promotion_requestsOrderByWithRelationInput => {
      if (props.body.sort === undefined || props.body.sort === null) {
        return { created_at: "desc" as const };
      }
      const parts = props.body.sort.split("-");
      const field = parts[0];
      const direction =
        parts[1] === "asc" ? ("asc" as const) : ("desc" as const);
      return {
        [field]: direction,
      };
    })();
  const records =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.count(
      {
        where: whereInput,
      },
    );
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer.transform,
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
// import { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
// import { IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformAdminAdministratorPromotionRequests(props: {
//   admin: AdminPayload;
//   body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
// }): Promise<IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.findMany({
//     ...EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------