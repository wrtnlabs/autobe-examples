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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer } from "../transformers/EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformSellerAdministratorPromotionRequests(props: {
  seller: SellerPayload;
  body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
}): Promise<IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.ecommerce_platform_administrator_promotion_requestsWhereInput =
    {};
  if (props.body.actor_type !== undefined && props.body.actor_type !== null) {
    whereClause.actor_type = props.body.actor_type;
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    whereClause.status = props.body.status;
  }
  if (props.body.reviewed !== undefined && props.body.reviewed !== null) {
    whereClause.reviewed_at =
      props.body.reviewed === true ? { not: null } : null;
  }
  if (
    props.body.reviewed_by_admin_id !== undefined &&
    props.body.reviewed_by_admin_id !== null
  ) {
    whereClause.reviewed_by_admin_id = props.body.reviewed_by_admin_id;
  }
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    whereClause.created_at = {
      gte: new Date(props.body.created_at_from),
      ...(props.body.created_at_to !== undefined &&
        props.body.created_at_to !== null && {
          lte: new Date(props.body.created_at_to),
        }),
    };
  }
  if (
    props.body.reviewed_at_from !== undefined &&
    props.body.reviewed_at_from !== null
  ) {
    whereClause.reviewed_at = {
      gte: new Date(props.body.reviewed_at_from),
      ...(props.body.reviewed_at_to !== undefined &&
        props.body.reviewed_at_to !== null && {
          lte: new Date(props.body.reviewed_at_to),
        }),
    };
  }
  if (props.body.search !== undefined && props.body.search !== null) {
    whereClause.OR = [
      {
        reason: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        rejection_reason: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    ];
  }
  const sortParts = props.body.sort?.split("-") ?? ["created_at", "desc"];
  const sortField = sortParts[0] as
    | "actor_type"
    | "status"
    | "reviewed_at"
    | "created_at"
    | "reviewed_by_admin_id";
  const sortDir = sortParts[1] as "asc" | "desc" | undefined;
  const orderByClause = (
    sortField === "actor_type"
      ? { actor_type: sortDir ?? ("desc" as const) }
      : sortField === "status"
        ? { status: sortDir ?? ("desc" as const) }
        : sortField === "reviewed_at"
          ? { reviewed_at: sortDir ?? ("desc" as const) }
          : sortField === "created_at"
            ? { created_at: sortDir ?? ("desc" as const) }
            : { reviewed_by_admin_id: sortDir ?? ("desc" as const) }
  ) satisfies Prisma.ecommerce_platform_administrator_promotion_requestsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.findMany(
      {
        where: whereClause,
        skip,
        take: limit,
        orderBy: orderByClause,
        ...EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_platform_administrator_promotion_requests.count(
      {
        where: whereClause,
      },
    );
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary;
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
// export async function patchEcommercePlatformSellerAdministratorPromotionRequests(props: {
//   seller: SellerPayload;
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