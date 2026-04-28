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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer } from "../transformers/EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerAdministratorPromotionRequests(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformAdministratorPromotionRequestOfCustomer.IRequest;
}): Promise<IPageIEcommercePlatformAdministratorPromotionRequestOfCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.ecommerce_platform_administrator_promotion_requestsWhereInput[] =
    [];
  if (props.body.actor_type !== undefined && props.body.actor_type !== null) {
    whereConditions.push({
      actor_type: props.body.actor_type,
    });
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    whereConditions.push({
      status: props.body.status,
    });
  }
  if (
    props.body.reviewed_by_admin_id !== undefined &&
    props.body.reviewed_by_admin_id !== null
  ) {
    whereConditions.push({
      reviewed_by_admin_id: props.body.reviewed_by_admin_id,
    });
  }
  if (props.body.reviewed === true) {
    whereConditions.push({
      NOT: { reviewed_at: null },
    });
  } else if (props.body.reviewed === false) {
    whereConditions.push({
      reviewed_at: null,
    });
  }
  const hasCreatedAtRange =
    (props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null) ||
    (props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null);
  if (hasCreatedAtRange) {
    whereConditions.push({
      created_at: {
        ...(props.body.created_at_from !== undefined &&
          props.body.created_at_from !== null && {
            gte: props.body.created_at_from,
          }),
        ...(props.body.created_at_to !== undefined &&
          props.body.created_at_to !== null && {
            lte: props.body.created_at_to,
          }),
      },
    });
  }
  const hasReviewedAtRange =
    (props.body.reviewed_at_from !== undefined &&
      props.body.reviewed_at_from !== null) ||
    (props.body.reviewed_at_to !== undefined &&
      props.body.reviewed_at_to !== null);
  if (hasReviewedAtRange) {
    whereConditions.push({
      reviewed_at: {
        ...(props.body.reviewed_at_from !== undefined &&
          props.body.reviewed_at_from !== null && {
            gte: props.body.reviewed_at_from,
          }),
        ...(props.body.reviewed_at_to !== undefined &&
          props.body.reviewed_at_to !== null && {
            lte: props.body.reviewed_at_to,
          }),
      },
    });
  }
  if (props.body.search !== undefined && props.body.search !== null) {
    whereConditions.push({
      OR: [
        { reason: { contains: props.body.search, mode: "insensitive" } },
        {
          rejection_reason: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ],
    });
  }
  const whereInput: Prisma.ecommerce_platform_administrator_promotion_requestsWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {};
  const sortDirective = props.body.sort ?? "created_at-desc";
  const sortParts = sortDirective.split("-");
  const field = sortParts[0];
  const direction: "asc" | "desc" = sortParts[1] === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.ecommerce_platform_administrator_promotion_requestsOrderByWithRelationInput =
    field === "actor_type"
      ? { actor_type: direction }
      : field === "status"
        ? { status: direction }
        : field === "reviewed_at"
          ? { reviewed_at: direction }
          : field === "reviewed_by_admin_id"
            ? { reviewed_by_admin_id: direction }
            : { created_at: direction };
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
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformAdministratorPromotionRequestOfCustomerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
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
// export async function patchEcommercePlatformCustomerAdministratorPromotionRequests(props: {
//   customer: CustomerPayload;
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