import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSalesSaleCodeQuestionsQuestionId(props: {
  seller: SellerPayload;
  saleCode: string;
  questionId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestionAnswer.IUpdate;
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

  if (sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const question = await MyGlobal.prisma.shopping_mall_sale_questions.findFirst(
    {
      where: {
        id: props.questionId,
        shopping_mall_sale_id: sale.id,
        deleted_at: null,
      },
      include: {
        buyer: true,
      },
    },
  );

  if (!question) {
    throw new HttpException("Question not found", 404);
  }

  const existingAnswer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findFirst({
      where: {
        shopping_mall_sale_question_id: props.questionId,
        deleted_at: null,
      },
    });

  let answer;
  const now = toISOStringSafe(new Date());

  if (existingAnswer) {
    const updateData: Record<string, unknown> = {
      updated_at: now,
    };

    if (props.body.title !== undefined) {
      updateData.title = props.body.title;
    }
    if (props.body.body !== undefined) {
      updateData.body = props.body.body;
    }

    answer = await MyGlobal.prisma.shopping_mall_sale_question_answers.update({
      where: { id: existingAnswer.id },
      data: updateData,
    });
  } else {
    if (props.body.title === undefined || props.body.body === undefined) {
      throw new HttpException(
        "Both title and body are required when creating a new answer",
        400,
      );
    }

    answer = await MyGlobal.prisma.shopping_mall_sale_question_answers.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_sale_question_id: props.questionId,
        shopping_mall_seller_id: props.seller.id,
        shopping_mall_seller_session_id: props.seller.session_id,
        title: props.body.title,
        body: props.body.body,
        created_at: now,
        updated_at: now,
      },
    });
  }

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
    sale: {
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
      brand: sale.brand ?? undefined,
      short_description: sale.short_description ?? undefined,
      price: 0,
      thumbnail_url: undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info: sale.warranty_info ?? undefined,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at: sale.deleted_at
        ? toISOStringSafe(sale.deleted_at)
        : undefined,
      seller: {
        id: sale.seller.id,
        store_name: sale.seller.store_name,
        email: sale.seller.email,
        status: sale.seller.status as
          | "pending"
          | "approved"
          | "rejected"
          | "suspended",
        email_verified: sale.seller.email_verified,
      },
      category: {
        id: sale.category.id,
        name: sale.category.name,
        slug: sale.category.slug,
        description: sale.category.description ?? undefined,
        image_url: sale.category.image_url ?? undefined,
        parent_id: sale.category.parent_id ?? undefined,
        status: sale.category.status,
        display_order: sale.category.display_order,
        product_count: sale.category.product_count,
        created_at: toISOStringSafe(sale.category.created_at),
        updated_at: toISOStringSafe(sale.category.updated_at),
      },
    },
    buyer: {
      id: question.buyer.id,
      email: question.buyer.email,
      full_name: question.buyer.full_name,
      phone_number: question.buyer.phone_number ?? undefined,
    },
    answer: {
      id: answer.id,
      title: answer.title,
      body: answer.body,
      shopping_mall_seller_id: answer.shopping_mall_seller_id,
      shopping_mall_seller_session_id: answer.shopping_mall_seller_session_id,
      shopping_mall_sale_question_id: answer.shopping_mall_sale_question_id,
      created_at: toISOStringSafe(answer.created_at),
      updated_at: toISOStringSafe(answer.updated_at),
      deleted_at: answer.deleted_at
        ? toISOStringSafe(answer.deleted_at)
        : undefined,
    },
  };
}
