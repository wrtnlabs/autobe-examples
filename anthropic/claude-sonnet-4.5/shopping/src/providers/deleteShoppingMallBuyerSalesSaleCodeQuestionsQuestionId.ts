import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function deleteShoppingMallBuyerSalesSaleCodeQuestionsQuestionId(props: {
  buyer: BuyerPayload;
  saleCode: string;
  questionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestion> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Product sale not found", 404);
  }

  const question = await MyGlobal.prisma.shopping_mall_sale_questions.findFirst(
    {
      where: {
        id: props.questionId,
        shopping_mall_sale_id: sale.id,
        deleted_at: null,
      },
    },
  );

  if (!question) {
    throw new HttpException("Question not found", 404);
  }

  if (question.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("You can only delete your own questions", 403);
  }

  const [
    saleData,
    sellerData,
    categoryData,
    skuData,
    imageData,
    buyerData,
    answerData,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sales.findUnique({
      where: { id: sale.id },
    }),
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    }),
    MyGlobal.prisma.shopping_mall_sale_skus.findFirst({
      where: { shopping_mall_sale_id: sale.id },
      orderBy: { base_price: "asc" },
    }),
    MyGlobal.prisma.shopping_mall_sale_images.findFirst({
      where: { shopping_mall_sale_id: sale.id },
      orderBy: { display_order: "asc" },
    }),
    MyGlobal.prisma.shopping_mall_buyers.findUnique({
      where: { id: question.shopping_mall_buyer_id },
    }),
    MyGlobal.prisma.shopping_mall_sale_question_answers.findFirst({
      where: {
        shopping_mall_sale_question_id: question.id,
        deleted_at: null,
      },
    }),
  ]);

  await MyGlobal.prisma.shopping_mall_sale_questions.delete({
    where: { id: props.questionId },
  });

  const minPrice = skuData ? skuData.base_price : 0;
  const thumbnailUrl = imageData ? imageData.url_thumbnail : null;

  return {
    id: question.id,
    shopping_mall_sale_id: question.shopping_mall_sale_id,
    shopping_mall_buyer_id: question.shopping_mall_buyer_id,
    shopping_mall_buyer_session_id: question.shopping_mall_buyer_session_id,
    title: question.title,
    body: question.body,
    created_at: toISOStringSafe(question.created_at),
    updated_at: toISOStringSafe(question.updated_at),
    deleted_at: question.deleted_at
      ? toISOStringSafe(question.deleted_at)
      : undefined,
    sale:
      saleData && sellerData && categoryData
        ? {
            id: saleData.id,
            code: saleData.code,
            title: saleData.title,
            status: typia.assert<
              | "draft"
              | "pending_approval"
              | "published"
              | "suspended"
              | "archived"
            >(saleData.status),
            condition: typia.assert<"new" | "refurbished" | "used">(
              saleData.condition,
            ),
            brand: saleData.brand ?? undefined,
            short_description: saleData.short_description ?? undefined,
            price: minPrice,
            thumbnail_url: thumbnailUrl
              ? (thumbnailUrl as string & tags.Format<"uri">)
              : undefined,
            return_policy_days: saleData.return_policy_days,
            warranty_info: saleData.warranty_info ?? undefined,
            created_at: toISOStringSafe(saleData.created_at),
            updated_at: toISOStringSafe(saleData.updated_at),
            deleted_at: saleData.deleted_at
              ? toISOStringSafe(saleData.deleted_at)
              : undefined,
            seller: {
              id: sellerData.id,
              store_name: sellerData.store_name,
              email: sellerData.email,
              status: typia.assert<
                "pending" | "approved" | "rejected" | "suspended"
              >(sellerData.status),
              email_verified: sellerData.email_verified,
            },
            category: {
              id: categoryData.id,
              name: categoryData.name,
              slug: categoryData.slug,
              description: categoryData.description ?? undefined,
              image_url: categoryData.image_url
                ? (categoryData.image_url as string & tags.Format<"uri">)
                : undefined,
              parent_id: categoryData.parent_id ?? undefined,
              status: categoryData.status,
              display_order: categoryData.display_order,
              product_count: categoryData.product_count,
              created_at: toISOStringSafe(categoryData.created_at),
              updated_at: toISOStringSafe(categoryData.updated_at),
            },
          }
        : undefined,
    buyer: buyerData
      ? {
          id: buyerData.id,
          email: buyerData.email,
          full_name: buyerData.full_name,
          phone_number: buyerData.phone_number ?? undefined,
        }
      : undefined,
    answer: answerData
      ? {
          id: answerData.id,
          title: answerData.title,
          body: answerData.body,
          shopping_mall_seller_id: answerData.shopping_mall_seller_id,
          shopping_mall_seller_session_id:
            answerData.shopping_mall_seller_session_id,
          shopping_mall_sale_question_id:
            answerData.shopping_mall_sale_question_id,
          created_at: toISOStringSafe(answerData.created_at),
          updated_at: toISOStringSafe(answerData.updated_at),
          deleted_at: answerData.deleted_at
            ? toISOStringSafe(answerData.deleted_at)
            : undefined,
        }
      : undefined,
  };
}
