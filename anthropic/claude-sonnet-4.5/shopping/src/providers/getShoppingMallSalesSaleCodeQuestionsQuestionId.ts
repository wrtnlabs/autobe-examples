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

export async function getShoppingMallSalesSaleCodeQuestionsQuestionId(props: {
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
    throw new HttpException("Sale not found", 404);
  }

  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUnique({
      where: {
        id: props.questionId,
      },
    });

  if (!question || question.deleted_at !== null) {
    throw new HttpException("Question not found", 404);
  }

  if (question.shopping_mall_sale_id !== sale.id) {
    throw new HttpException("Question not found", 404);
  }

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: {
      id: question.shopping_mall_buyer_id,
    },
  });

  if (!buyer) {
    throw new HttpException("Buyer not found", 404);
  }

  const answer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findFirst({
      where: {
        shopping_mall_sale_question_id: props.questionId,
        deleted_at: null,
      },
    });

  const buyerSummary: IShoppingMallBuyer.ISummary = {
    id: buyer.id,
    email: buyer.email,
    full_name: buyer.full_name,
    phone_number: buyer.phone_number === null ? null : buyer.phone_number,
  };

  const sellerSummary: IShoppingMallSeller.ISummary = {
    id: sale.seller.id,
    store_name: sale.seller.store_name,
    email: sale.seller.email,
    status: sale.seller.status as
      | "pending"
      | "approved"
      | "rejected"
      | "suspended",
    email_verified: sale.seller.email_verified,
  };

  const categorySummary: IShoppingMallCategory.ISummary = {
    id: sale.category.id,
    name: sale.category.name,
    slug: sale.category.slug,
    description:
      sale.category.description === null ? null : sale.category.description,
    image_url:
      sale.category.image_url === null ? null : sale.category.image_url,
    parent_id:
      sale.category.parent_id === null ? null : sale.category.parent_id,
    status: sale.category.status,
    display_order: sale.category.display_order,
    product_count: sale.category.product_count,
    created_at: toISOStringSafe(sale.category.created_at),
    updated_at: toISOStringSafe(sale.category.updated_at),
  };

  const saleSummary: IShoppingMallSale.ISummary = {
    id: sale.id,
    code: sale.code,
    title: sale.title,
    status: sale.status as
      | "draft"
      | "pending_approval"
      | "published"
      | "suspended"
      | "archived",
    condition: sale.condition as "new" | "refurbished" | "used",
    brand: sale.brand === null ? null : sale.brand,
    short_description:
      sale.short_description === null ? null : sale.short_description,
    price: 0,
    thumbnail_url: null,
    return_policy_days: sale.return_policy_days,
    warranty_info: sale.warranty_info === null ? null : sale.warranty_info,
    created_at: toISOStringSafe(sale.created_at),
    updated_at: toISOStringSafe(sale.updated_at),
    deleted_at:
      sale.deleted_at === null ? null : toISOStringSafe(sale.deleted_at),
    seller: sellerSummary,
    category: categorySummary,
  };

  const answerData: IShoppingMallSaleQuestionAnswer | null = answer
    ? {
        id: answer.id,
        title: answer.title,
        body: answer.body,
        shopping_mall_seller_id: answer.shopping_mall_seller_id,
        shopping_mall_seller_session_id: answer.shopping_mall_seller_session_id,
        shopping_mall_sale_question_id: answer.shopping_mall_sale_question_id,
        created_at: toISOStringSafe(answer.created_at),
        updated_at: toISOStringSafe(answer.updated_at),
        deleted_at:
          answer.deleted_at === null
            ? null
            : toISOStringSafe(answer.deleted_at),
      }
    : null;

  return {
    id: question.id,
    shopping_mall_sale_id: question.shopping_mall_sale_id,
    shopping_mall_buyer_id: question.shopping_mall_buyer_id,
    shopping_mall_buyer_session_id: question.shopping_mall_buyer_session_id,
    title: question.title,
    body: question.body,
    created_at: toISOStringSafe(question.created_at),
    updated_at: toISOStringSafe(question.updated_at),
    deleted_at:
      question.deleted_at === null
        ? null
        : toISOStringSafe(question.deleted_at),
    sale: saleSummary,
    buyer: buyerSummary,
    answer: answerData,
  };
}
