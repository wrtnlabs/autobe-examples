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

export async function patchShoppingMallSellerAnalyticsSaleQuestions(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleQuestion.IRequest;
}): Promise<IPageIShoppingMallSaleQuestion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_questionsWhereInput = {
    deleted_at: null,
    ...(props.body.status ? { status: props.body.status } : {}),
    created_at: {
      ...(props.body.createdAtFrom ? { gte: props.body.createdAtFrom } : {}),
      ...(props.body.createdAtTo ? { lte: props.body.createdAtTo } : {}),
    },
    updated_at: {
      ...(props.body.updatedAtFrom ? { gte: props.body.updatedAtFrom } : {}),
      ...(props.body.updatedAtTo ? { lte: props.body.updatedAtTo } : {}),
    },
    ...(props.body.search
      ? {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            { body: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
    sale: {
      is: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  };
  const orderBy: Prisma.shopping_mall_sale_questionsOrderByWithRelationInput = {
    created_at: "desc",
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_questions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
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
  const toDateTimeString = (
    dt: Date | string | null | undefined,
  ): (string & tags.Format<"date-time">) | null => {
    if (dt === null || dt === undefined) return null;
    if (dt instanceof Date) {
      return toISOStringSafe(dt) as string & tags.Format<"date-time">;
    }
    return dt as string & tags.Format<"date-time">;
  };
  return {
    data: await Promise.all(
      data.map(async (item) => ({
        id: item.id as string & tags.Format<"uuid">,
        title: item.title,
        status: item.status,
        createdAt: toDateTimeString(item.created_at)!,
        updatedAt: toDateTimeString(item.updated_at)!,
        deletedAt: toDateTimeString(item.deleted_at),
        sale: {
          id: item.sale.id as string & tags.Format<"uuid">,
          name: item.sale.name,
          basePrice: item.sale.base_price,
          status: item.sale.status,
          createdAt: toDateTimeString(item.sale.created_at)!,
          updatedAt: toDateTimeString(item.sale.updated_at)!,
          deletedAt: toDateTimeString(item.sale.deleted_at),
          seller: {
            id: item.sale.seller.id as string & tags.Format<"uuid">,
            email: item.sale.seller.email,
            shopName: item.sale.seller.shop_name,
            shopDescription: item.sale.seller.shop_description ?? null,
            logoUri: item.sale.seller.logo_uri ?? null,
            approvalStatus: item.sale.seller.approval_status,
            rejectionReason: item.sale.seller.rejection_reason ?? null,
          },
          category: {
            id: item.sale.category.id as string & tags.Format<"uuid">,
            name: item.sale.category.name,
            description: item.sale.category.description,
            created_at: toDateTimeString(item.sale.category.created_at)!,
            updated_at: toDateTimeString(item.sale.category.updated_at)!,
            deleted_at: toDateTimeString(item.sale.category.deleted_at),
          },
        } satisfies IShoppingMallSale.ISummary,
        customer: {
          id: item.customer.id as string & tags.Format<"uuid">,
          email: item.customer.email,
          displayName: item.customer.display_name ?? null,
          phoneNumber: item.customer.phone_number ?? null,
          createdAt: toDateTimeString(item.customer.created_at)!,
          updatedAt: toDateTimeString(item.customer.updated_at)!,
        } satisfies IShoppingMallCustomer.ISummary,
      })),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
