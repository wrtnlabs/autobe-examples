import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

export async function patchShoppingMallSalesShoppingMallSaleCodeQuestions(props: {
  shoppingMallSaleCode: string;
  body: IShoppingMallSaleQuestion.IRequest;
}): Promise<IPageIShoppingMallSaleQuestion.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.shoppingMallSaleCode,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!sale) {
    throw new HttpException("Product sale not found", 404);
  }

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  let questionIdsWithAnswers: Set<string> | null = null;

  if (props.body.has_answer !== undefined && props.body.has_answer !== null) {
    const answers =
      await MyGlobal.prisma.shopping_mall_sale_question_answers.findMany({
        where: {
          deleted_at: null,
        },
        select: { shopping_mall_sale_question_id: true },
      });

    questionIdsWithAnswers = new Set(
      answers.map((a) => a.shopping_mall_sale_question_id),
    );
  }

  const baseWhere = {
    shopping_mall_sale_id: sale.id,
    deleted_at: null,
    ...(props.body.shopping_mall_buyer_id !== undefined &&
      props.body.shopping_mall_buyer_id !== null && {
        shopping_mall_buyer_id: props.body.shopping_mall_buyer_id,
      }),
    ...(questionIdsWithAnswers !== null && {
      id: props.body.has_answer
        ? { in: Array.from(questionIdsWithAnswers) }
        : { notIn: Array.from(questionIdsWithAnswers) },
    }),
    ...((props.body.created_after !== undefined &&
      props.body.created_after !== null) ||
    (props.body.created_before !== undefined &&
      props.body.created_before !== null)
      ? {
          created_at: {
            ...(props.body.created_after !== undefined &&
              props.body.created_after !== null && {
                gte: new Date(props.body.created_after),
              }),
            ...(props.body.created_before !== undefined &&
              props.body.created_before !== null && {
                lt: new Date(props.body.created_before),
              }),
          },
        }
      : {}),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        OR: [
          { title: { contains: props.body.search } },
          { body: { contains: props.body.search } },
        ],
      }),
  };

  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";

  const [questions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_questions.findMany({
      where: baseWhere,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: {
        buyer: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_sale_questions.count({
      where: baseWhere,
    }),
  ]);

  const questionIds = questions.map((q) => q.id);
  const answersForDisplay =
    questionIds.length > 0
      ? await MyGlobal.prisma.shopping_mall_sale_question_answers.findMany({
          where: {
            shopping_mall_sale_question_id: { in: questionIds },
            deleted_at: null,
          },
          select: { shopping_mall_sale_question_id: true },
        })
      : [];

  const answeredSet = new Set(
    answersForDisplay.map((a) => a.shopping_mall_sale_question_id),
  );

  const data = questions.map((question) => ({
    id: question.id,
    title: question.title,
    created_at: toISOStringSafe(question.created_at),
    buyer: {
      id: question.buyer.id,
      email: question.buyer.email,
      full_name: question.buyer.full_name,
      phone_number:
        question.buyer.phone_number === null
          ? undefined
          : question.buyer.phone_number,
    },
    has_answer: answeredSet.has(question.id),
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
