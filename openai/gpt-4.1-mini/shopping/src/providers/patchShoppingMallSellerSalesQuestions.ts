import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSalesQuestions(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleQuestion.IRequest;
}): Promise<IPageIShoppingMallSaleQuestion.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 ? props.body.limit : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_questionsWhereInput = {
    deleted_at: null,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.createdAtFrom
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo
      ? { created_at: { lte: props.body.createdAtTo } }
      : {}),
    ...(props.body.updatedAtFrom
      ? { updated_at: { gte: props.body.updatedAtFrom } }
      : {}),
    ...(props.body.updatedAtTo
      ? { updated_at: { lte: props.body.updatedAtTo } }
      : {}),
    ...(props.body.search
      ? {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            { body: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_questions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      sale: {
        select: {
          id: true,
          name: true,
          base_price: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              shop_name: true,
              shop_description: true,
              logo_uri: true,
              approval_status: true,
              rejection_reason: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_questions.count({
    where,
  });
  const records: IShoppingMallSaleQuestion.ISummary[] = data.map((record) => ({
    id: record.id,
    title: record.title,
    status: record.status,
    createdAt: toISOStringSafe(record.created_at) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    updatedAt: toISOStringSafe(record.updated_at) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    deletedAt: record.deleted_at
      ? (toISOStringSafe(record.deleted_at) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">)
      : null,
    sale: {
      id: record.sale.id,
      name: record.sale.name,
      basePrice: record.sale.base_price,
      status: record.sale.status,
      createdAt: toISOStringSafe(record.sale.created_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.sale.updated_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      deletedAt: record.sale.deleted_at
        ? (toISOStringSafe(record.sale.deleted_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">)
        : null,
      seller: {
        id: record.sale.seller.id,
        email: record.sale.seller.email,
        shopName: record.sale.seller.shop_name,
        shopDescription: record.sale.seller.shop_description ?? null,
        logoUri: record.sale.seller.logo_uri ?? null,
        approvalStatus: record.sale.seller.approval_status,
        rejectionReason: record.sale.seller.rejection_reason ?? null,
      },
      category: {
        id: record.sale.category.id,
        name: record.sale.category.name,
        description: record.sale.category.description,
        createdAt: toISOStringSafe(
          record.sale.category.created_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(
          record.sale.category.updated_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        deletedAt: record.sale.category.deleted_at
          ? (toISOStringSafe(record.sale.category.deleted_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">)
          : null,
      },
    },
    customer: {
      id: record.customer.id,
      email: record.customer.email,
      displayName: record.customer.display_name ?? null,
      phoneNumber: record.customer.phone_number ?? null,
      createdAt: toISOStringSafe(record.customer.created_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.customer.updated_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
    },
  }));
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: records,
  } satisfies IPageIShoppingMallSaleQuestion.ISummary;
}
