import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function deleteShoppingMallSalesSaleCodeQuestionsQuestionId(props: {
  buyer: BuyerPayload;
  saleCode: string;
  questionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestion> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { code: props.saleCode },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUnique({
      where: { id: props.questionId },
    });

  if (!question || question.deleted_at !== null) {
    throw new HttpException("Question not found", 404);
  }

  if (question.shopping_mall_sale_id !== sale.id) {
    throw new HttpException("Question does not belong to this sale", 404);
  }

  if (question.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const [questionSale, questionBuyer, questionAnswer] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sales.findUnique({
      where: { id: question.shopping_mall_sale_id },
      include: {
        seller: true,
        category: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_buyers.findUnique({
      where: { id: question.shopping_mall_buyer_id },
    }),
    MyGlobal.prisma.shopping_mall_sale_question_answers.findUnique({
      where: { shopping_mall_sale_question_id: props.questionId },
    }),
  ]);

  await MyGlobal.prisma.shopping_mall_sale_questions.delete({
    where: { id: props.questionId },
  });

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
      : null,
    sale: questionSale
      ? {
          id: questionSale.id,
          code: questionSale.code,
          title: questionSale.title,
          status: typia.assert<
            | "draft"
            | "pending_approval"
            | "published"
            | "suspended"
            | "archived"
          >(questionSale.status),
          condition: typia.assert<"new" | "refurbished" | "used">(
            questionSale.condition,
          ),
          brand: questionSale.brand ?? null,
          short_description: questionSale.short_description ?? null,
          price: 0,
          thumbnail_url: null,
          return_policy_days: questionSale.return_policy_days,
          warranty_info: questionSale.warranty_info ?? null,
          created_at: toISOStringSafe(questionSale.created_at),
          updated_at: toISOStringSafe(questionSale.updated_at),
          deleted_at: questionSale.deleted_at
            ? toISOStringSafe(questionSale.deleted_at)
            : null,
          seller: {
            id: questionSale.seller.id,
            store_name: questionSale.seller.store_name,
            email: questionSale.seller.email,
            status: typia.assert<
              "pending" | "approved" | "rejected" | "suspended"
            >(questionSale.seller.status),
            email_verified: questionSale.seller.email_verified,
          },
          category: {
            id: questionSale.category.id,
            name: questionSale.category.name,
            slug: questionSale.category.slug,
            description: questionSale.category.description ?? null,
            image_url: questionSale.category.image_url ?? null,
            parent_id: questionSale.category.parent_id ?? null,
            status: questionSale.category.status,
            display_order: questionSale.category.display_order,
            product_count: questionSale.category.product_count,
            created_at: toISOStringSafe(questionSale.category.created_at),
            updated_at: toISOStringSafe(questionSale.category.updated_at),
          },
        }
      : undefined,
    buyer: questionBuyer
      ? {
          id: questionBuyer.id,
          email: questionBuyer.email,
          full_name: questionBuyer.full_name,
          phone_number: questionBuyer.phone_number ?? null,
        }
      : undefined,
    answer: questionAnswer
      ? {
          id: questionAnswer.id,
          title: questionAnswer.title,
          body: questionAnswer.body,
          shopping_mall_seller_id: questionAnswer.shopping_mall_seller_id,
          shopping_mall_seller_session_id:
            questionAnswer.shopping_mall_seller_session_id,
          shopping_mall_sale_question_id:
            questionAnswer.shopping_mall_sale_question_id,
          created_at: toISOStringSafe(questionAnswer.created_at),
          updated_at: toISOStringSafe(questionAnswer.updated_at),
          deleted_at: questionAnswer.deleted_at
            ? toISOStringSafe(questionAnswer.deleted_at)
            : null,
        }
      : null,
  };
}
