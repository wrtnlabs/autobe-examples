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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSalesSaleCodeQuestionsQuestionId(props: {
  admin: AdminPayload;
  saleCode: string;
  questionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestion> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
    include: {
      seller: true,
      category: true,
    },
  });

  if (!sale) {
    throw new HttpException("Product sale not found", 404);
  }

  const existingQuestion =
    await MyGlobal.prisma.shopping_mall_sale_questions.findFirst({
      where: {
        id: props.questionId,
        shopping_mall_sale_id: sale.id,
      },
    });

  if (!existingQuestion) {
    throw new HttpException("Question not found for this product sale", 404);
  }

  const deletedQuestion =
    await MyGlobal.prisma.shopping_mall_sale_questions.update({
      where: { id: props.questionId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: deletedQuestion.shopping_mall_buyer_id },
  });

  const answer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findFirst({
      where: {
        shopping_mall_sale_question_id: deletedQuestion.id,
      },
    });

  return {
    id: deletedQuestion.id,
    shopping_mall_sale_id: deletedQuestion.shopping_mall_sale_id,
    shopping_mall_buyer_id: deletedQuestion.shopping_mall_buyer_id,
    shopping_mall_buyer_session_id:
      deletedQuestion.shopping_mall_buyer_session_id,
    title: deletedQuestion.title,
    body: deletedQuestion.body,
    created_at: toISOStringSafe(deletedQuestion.created_at),
    updated_at: toISOStringSafe(deletedQuestion.updated_at),
    deleted_at: deletedQuestion.deleted_at
      ? toISOStringSafe(deletedQuestion.deleted_at)
      : null,
    sale: {
      id: sale.id,
      code: sale.code,
      title: sale.title,
      status: typia.assert<
        "draft" | "pending_approval" | "published" | "suspended" | "archived"
      >(sale.status),
      condition: typia.assert<"new" | "refurbished" | "used">(sale.condition),
      brand: sale.brand ?? null,
      short_description: sale.short_description ?? null,
      price: 0,
      thumbnail_url: null,
      return_policy_days: sale.return_policy_days,
      warranty_info: sale.warranty_info ?? null,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at: sale.deleted_at ? toISOStringSafe(sale.deleted_at) : null,
      seller: {
        id: sale.seller.id,
        store_name: sale.seller.store_name,
        email: sale.seller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          sale.seller.status,
        ),
        email_verified: sale.seller.email_verified,
      },
      category: {
        id: sale.category.id,
        name: sale.category.name,
        slug: sale.category.slug,
        description: sale.category.description ?? null,
        image_url: sale.category.image_url ?? null,
        parent_id: sale.category.parent_id ?? null,
        status: sale.category.status,
        display_order: sale.category.display_order,
        product_count: sale.category.product_count,
        created_at: toISOStringSafe(sale.category.created_at),
        updated_at: toISOStringSafe(sale.category.updated_at),
      },
    },
    buyer: buyer
      ? {
          id: buyer.id,
          email: buyer.email,
          full_name: buyer.full_name,
          phone_number: buyer.phone_number ?? null,
        }
      : undefined,
    answer: answer
      ? {
          id: answer.id,
          title: answer.title,
          body: answer.body,
          shopping_mall_seller_id: answer.shopping_mall_seller_id,
          shopping_mall_seller_session_id:
            answer.shopping_mall_seller_session_id,
          shopping_mall_sale_question_id: answer.shopping_mall_sale_question_id,
          created_at: toISOStringSafe(answer.created_at),
          updated_at: toISOStringSafe(answer.updated_at),
          deleted_at: answer.deleted_at
            ? toISOStringSafe(answer.deleted_at)
            : null,
        }
      : null,
  };
}
