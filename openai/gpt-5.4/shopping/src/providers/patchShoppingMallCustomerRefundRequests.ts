import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallRefundRequestAtSummaryTransformer } from "../transformers/ShoppingMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string = props.body.search?.trim() ?? "";
  const createdAtFilter =
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          ...(props.body.createdAtFrom !== undefined
            ? { gte: new Date(props.body.createdAtFrom) }
            : {}),
          ...(props.body.createdAtTo !== undefined
            ? { lte: new Date(props.body.createdAtTo) }
            : {}),
        }
      : undefined;
  const reviewedAtFilter =
    props.body.reviewedAtFrom !== undefined ||
    props.body.reviewedAtTo !== undefined
      ? {
          ...(props.body.reviewedAtFrom !== undefined
            ? { gte: new Date(props.body.reviewedAtFrom) }
            : {}),
          ...(props.body.reviewedAtTo !== undefined
            ? { lte: new Date(props.body.reviewedAtTo) }
            : {}),
        }
      : undefined;
  const deliveredAtFilter =
    props.body.deliveredAtFrom !== undefined ||
    props.body.deliveredAtTo !== undefined
      ? {
          ...(props.body.deliveredAtFrom !== undefined
            ? { gte: new Date(props.body.deliveredAtFrom) }
            : {}),
          ...(props.body.deliveredAtTo !== undefined
            ? { lte: new Date(props.body.deliveredAtTo) }
            : {}),
        }
      : undefined;
  const where = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.reviewerRole !== undefined
      ? { reviewer_role: props.body.reviewerRole }
      : {}),
    ...(props.body.orderItemId !== undefined
      ? { shopping_mall_order_item_id: props.body.orderItemId }
      : {}),
    ...(createdAtFilter !== undefined ? { created_at: createdAtFilter } : {}),
    ...(reviewedAtFilter !== undefined
      ? { reviewed_at: reviewedAtFilter }
      : {}),
    orderItem: {
      deleted_at: null,
      ...(props.body.orderStatus !== undefined
        ? { status: props.body.orderStatus }
        : {}),
      ...(deliveredAtFilter !== undefined
        ? { delivered_at: deliveredAtFilter }
        : {}),
      order: {
        deleted_at: null,
        ...(props.body.orderCode !== undefined
          ? { code: props.body.orderCode }
          : {}),
      },
    },
    ...(search.length !== 0
      ? {
          OR: [
            {
              reason: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              review_note: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              orderItem: {
                order: {
                  code: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.shopping_mall_refund_requestsWhereInput;
  const sortText: string = props.body.sort ?? "created_at:desc";
  const separator: string = sortText.includes(":")
    ? ":"
    : sortText.lastIndexOf("_") > 0
      ? "_"
      : "";
  const sortField: string =
    separator === ""
      ? sortText
      : separator === ":"
        ? (sortText.split(":", 2)[0] ?? "created_at")
        : sortText.slice(0, sortText.lastIndexOf("_"));
  const sortDirectionText: string =
    separator === ""
      ? "desc"
      : separator === ":"
        ? (sortText.split(":", 2)[1] ?? "desc")
        : sortText.slice(sortText.lastIndexOf("_") + 1);
  const sortDirection: Prisma.SortOrder =
    sortDirectionText === "asc" ? "asc" : "desc";
  const orderBy: Prisma.shopping_mall_refund_requestsOrderByWithRelationInput[] =
    sortField === "updated_at"
      ? [{ updated_at: sortDirection }, { id: "asc" }]
      : sortField === "reviewed_at"
        ? [{ reviewed_at: sortDirection }, { id: "asc" }]
        : sortField === "status"
          ? [{ status: sortDirection }, { id: "asc" }]
          : [{ created_at: sortDirection }, { id: "asc" }];
  const select = ShoppingMallRefundRequestAtSummaryTransformer.select().select;
  const data = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select,
  });
  const total = await MyGlobal.prisma.shopping_mall_refund_requests.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallRefundRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
