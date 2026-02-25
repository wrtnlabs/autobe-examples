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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCustomerSaleQuestions(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleQuestion.IRequest;
}): Promise<IPageIShoppingMallSaleQuestion.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 ? props.body.limit : 100;
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
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_questions.findMany({
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
                approval_status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
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
    }),
    MyGlobal.prisma.shopping_mall_sale_questions.count({ where }),
  ]);
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: data.map((record) => ({
      id: record.id,
      title: record.title,
      status: record.status,
      created_at: toISOStringSafe(record.created_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      deleted_at: record.deleted_at
        ? toISOStringSafe(record.deleted_at)
        : (null satisfies (string & tags.Format<"date-time">) | null as
            | (string & tags.Format<"date-time">)
            | null),
      sale: {
        id: record.sale.id,
        name: record.sale.name,
        base_price: record.sale.base_price,
        status: record.sale.status,
        created_at: toISOStringSafe(record.sale.created_at) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        updated_at: toISOStringSafe(record.sale.updated_at) satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        deleted_at: record.sale.deleted_at
          ? toISOStringSafe(record.sale.deleted_at)
          : (null satisfies (string & tags.Format<"date-time">) | null as
              | (string & tags.Format<"date-time">)
              | null),
        seller: {
          id: record.sale.seller.id,
          email: record.sale.seller.email,
          shop_name: record.sale.seller.shop_name ?? undefined,
          approval_status: record.sale.seller.approval_status,
          created_at: toISOStringSafe(
            record.sale.seller.created_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(
            record.sale.seller.updated_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          deleted_at: record.sale.seller.deleted_at
            ? toISOStringSafe(record.sale.seller.deleted_at)
            : (null satisfies (string & tags.Format<"date-time">) | null as
                | (string & tags.Format<"date-time">)
                | null),
        } satisfies IShoppingMallSeller.ISummary,
        category: {
          id: record.sale.category.id,
          name: record.sale.category.name,
          description: record.sale.category.description ?? undefined,
          created_at: toISOStringSafe(
            record.sale.category.created_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(
            record.sale.category.updated_at,
          ) satisfies string & tags.Format<"date-time"> as string &
            tags.Format<"date-time">,
          deleted_at: record.sale.category.deleted_at
            ? toISOStringSafe(record.sale.category.deleted_at)
            : (null satisfies (string & tags.Format<"date-time">) | null as
                | (string & tags.Format<"date-time">)
                | null),
        } satisfies IShoppingMallProductCategory.ISummary,
      } satisfies IShoppingMallSale.ISummary,
      customer: {
        id: record.customer.id,
        email: record.customer.email,
        display_name: record.customer.display_name ?? undefined,
        phone_number: record.customer.phone_number ?? undefined,
        created_at: toISOStringSafe(
          record.customer.created_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(
          record.customer.updated_at,
        ) satisfies string & tags.Format<"date-time"> as string &
          tags.Format<"date-time">,
      } satisfies IShoppingMallCustomer.ISummary,
    })),
  } satisfies IPageIShoppingMallSaleQuestion.ISummary;
}
