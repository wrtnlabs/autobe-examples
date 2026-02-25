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

export async function patchShoppingMallCustomerSalesSaleIdQuestions(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestion.IRequest;
}): Promise<IPageIShoppingMallSaleQuestion.ISummary> {
  const {
    status,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
    search,
    page = 1,
    limit = 10,
  } = props.body;
  const where: Prisma.shopping_mall_sale_questionsWhereInput = {
    shopping_mall_sale_id: props.saleId,
    deleted_at: null,
    ...(status ? { status } : {}),
    ...(createdAtFrom ? { created_at: { gte: createdAtFrom } } : {}),
    ...(createdAtTo ? { created_at: { lte: createdAtTo } } : {}),
    ...(updatedAtFrom ? { updated_at: { gte: updatedAtFrom } } : {}),
    ...(updatedAtTo ? { updated_at: { lte: updatedAtTo } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const pageNumber = page >= 1 ? page : 1;
  const perPage = limit >= 1 ? limit : 10;
  const skip = (pageNumber - 1) * perPage;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_questions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: perPage,
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
    }),
    MyGlobal.prisma.shopping_mall_sale_questions.count({ where }),
  ]);
  const transformedData: IShoppingMallSaleQuestion.ISummary[] =
    await Promise.all(
      data.map(async (question) => ({
        id: question.id,
        title: question.title,
        status: question.status,
        createdAt: toISOStringSafe(question.created_at),
        updatedAt: toISOStringSafe(question.updated_at),
        deletedAt: question.deleted_at
          ? toISOStringSafe(question.deleted_at)
          : null,
        sale: {
          id: question.sale.id,
          name: question.sale.name,
          basePrice: question.sale.base_price,
          status: question.sale.status,
          createdAt: toISOStringSafe(question.sale.created_at),
          updatedAt: toISOStringSafe(question.sale.updated_at),
          deletedAt: question.sale.deleted_at
            ? toISOStringSafe(question.sale.deleted_at)
            : null,
          seller: {
            id: question.sale.seller.id,
            email: question.sale.seller.email,
            shopName: question.sale.seller.shop_name,
            shopDescription: question.sale.seller.shop_description ?? null,
            logoUri: question.sale.seller.logo_uri ?? null,
            approvalStatus: question.sale.seller.approval_status,
            rejectionReason: question.sale.seller.rejection_reason ?? null,
          },
          category: {
            id: question.sale.category.id,
            name: question.sale.category.name,
            description: question.sale.category.description,
            created_at: toISOStringSafe(question.sale.category.created_at),
            updated_at: toISOStringSafe(question.sale.category.updated_at),
            deleted_at: question.sale.category.deleted_at
              ? toISOStringSafe(question.sale.category.deleted_at)
              : null,
          } satisfies IShoppingMallProductCategory.ISummary,
        },
        customer: {
          id: question.customer.id,
          email: question.customer.email,
          displayName: question.customer.display_name ?? null,
          phoneNumber: question.customer.phone_number ?? null,
          createdAt: toISOStringSafe(question.customer.created_at),
          updatedAt: toISOStringSafe(question.customer.updated_at),
        },
      })),
    );
  return {
    pagination: {
      current: pageNumber,
      limit: perPage,
      records: total,
      pages: Math.ceil(total / perPage),
    },
    data: transformedData,
  };
}
