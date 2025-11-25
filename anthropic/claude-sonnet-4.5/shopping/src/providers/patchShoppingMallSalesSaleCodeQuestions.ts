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

export async function patchShoppingMallSalesSaleCodeQuestions(props: {
  saleCode: string;
  body: IShoppingMallSaleQuestion.IRequest;
}): Promise<IPageIShoppingMallSaleQuestion.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      shopping_mall_sale_id: sale.id,
      deleted_at: null,
    };

    if (
      props.body.shopping_mall_buyer_id !== undefined &&
      props.body.shopping_mall_buyer_id !== null
    ) {
      conditions.shopping_mall_buyer_id = props.body.shopping_mall_buyer_id;
    }

    if (props.body.created_after || props.body.created_before) {
      const createdAtCondition: Record<string, unknown> = {};
      if (props.body.created_after) {
        createdAtCondition.gte = new Date(props.body.created_after);
      }
      if (props.body.created_before) {
        createdAtCondition.lt = new Date(props.body.created_before);
      }
      conditions.created_at = createdAtCondition;
    }

    if (props.body.search !== undefined && props.body.search !== null) {
      conditions.OR = [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ];
    }

    if (props.body.has_answer !== undefined && props.body.has_answer !== null) {
      if (props.body.has_answer) {
        conditions.shopping_mall_sale_question_answers = {
          is: {
            deleted_at: null,
          },
        };
      } else {
        conditions.shopping_mall_sale_question_answers = {
          is: null,
        };
      }
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const skip = (props.body.page - 1) * props.body.limit;

  const [questions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_questions.findMany({
      where: whereCondition,
      skip,
      take: props.body.limit,
      orderBy: { [sortField]: sortOrder },
      include: {
        buyer: true,
        shopping_mall_sale_question_answers: {
          where: {
            deleted_at: null,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_sale_questions.count({
      where: whereCondition,
    }),
  ]);

  const data = questions.map((question) => ({
    id: question.id,
    title: question.title,
    created_at: toISOStringSafe(question.created_at),
    buyer: {
      id: question.buyer.id,
      email: question.buyer.email,
      full_name: question.buyer.full_name,
      phone_number: question.buyer.phone_number ?? undefined,
    },
    has_answer: question.shopping_mall_sale_question_answers !== null,
  }));

  const pages = Math.ceil(total / props.body.limit);

  return {
    pagination: {
      current: props.body.page,
      limit: props.body.limit,
      records: total,
      pages,
    },
    data,
  };
}
