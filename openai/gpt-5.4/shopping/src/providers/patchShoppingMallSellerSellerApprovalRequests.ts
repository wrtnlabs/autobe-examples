import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerApprovalRequestAtSummaryTransformer } from "../transformers/ShoppingMallSellerApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerApprovalRequest.IRequest;
}): Promise<IPageIShoppingMallSellerApprovalRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.status !== undefined &&
    props.body.status !== "pending" &&
    props.body.status !== "approved" &&
    props.body.status !== "rejected"
  ) {
    throw new HttpException("Invalid status", 400);
  }
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined &&
    props.body.created_at_from > props.body.created_at_to
  ) {
    throw new HttpException("Invalid created_at range", 400);
  }
  if (
    props.body.reviewed_at_from !== undefined &&
    props.body.reviewed_at_to !== undefined &&
    props.body.reviewed_at_from > props.body.reviewed_at_to
  ) {
    throw new HttpException("Invalid reviewed_at range", 400);
  }
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "created_at_asc" &&
    props.body.sort !== "created_at_desc" &&
    props.body.sort !== "reviewed_at_asc" &&
    props.body.sort !== "reviewed_at_desc" &&
    props.body.sort !== "status_asc" &&
    props.body.sort !== "status_desc"
  ) {
    throw new HttpException("Invalid sort", 400);
  }
  const where = {
    deleted_at: null,
    shopping_mall_seller_id:
      props.body.shopping_mall_seller_id ?? props.seller.id,
    ...(props.body.id !== undefined && {
      id: props.body.id,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.shopping_mall_administrator_id !== undefined && {
      shopping_mall_administrator_id: props.body.shopping_mall_administrator_id,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length !== 0 && {
        reason: {
          contains: props.body.search,
          mode: "insensitive",
        },
      }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: props.body.created_at_from,
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: props.body.created_at_to,
        }),
      },
    }),
    ...((props.body.reviewed_at_from !== undefined ||
      props.body.reviewed_at_to !== undefined) && {
      reviewed_at: {
        ...(props.body.reviewed_at_from !== undefined && {
          gte: props.body.reviewed_at_from,
        }),
        ...(props.body.reviewed_at_to !== undefined && {
          lte: props.body.reviewed_at_to,
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_seller_approval_requestsWhereInput;
  const orderBy: Prisma.shopping_mall_seller_approval_requestsOrderByWithRelationInput[] =
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "created_at_desc"
        ? [{ created_at: "desc" }, { id: "desc" }]
        : props.body.sort === "reviewed_at_asc"
          ? [{ reviewed_at: "asc" }, { id: "asc" }]
          : props.body.sort === "reviewed_at_desc"
            ? [{ reviewed_at: "desc" }, { id: "desc" }]
            : props.body.sort === "status_asc"
              ? [{ status: "asc" }, { id: "asc" }]
              : props.body.sort === "status_desc"
                ? [{ status: "desc" }, { id: "desc" }]
                : [{ created_at: "desc" }, { id: "desc" }];
  const data =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        status: true,
        reason: true,
        reviewed_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            banned: true,
            approval_status: true,
            rejection_reason: true,
            suspended: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            banned: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerApprovalRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
