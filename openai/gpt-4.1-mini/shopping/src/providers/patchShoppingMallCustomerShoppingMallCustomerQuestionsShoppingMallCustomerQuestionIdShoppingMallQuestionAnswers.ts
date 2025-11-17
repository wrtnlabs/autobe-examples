import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallQuestionAnswer";
import { IPageIShoppingMallQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallQuestionAnswer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallCustomerQuestionsShoppingMallCustomerQuestionIdShoppingMallQuestionAnswers(props: {
  customer: CustomerPayload;
  shoppingMallCustomerQuestionId: string & tags.Format<"uuid">;
  body: IShoppingMallQuestionAnswer.IRequest;
}): Promise<IPageIShoppingMallQuestionAnswer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_customer_question_id: props.shoppingMallCustomerQuestionId,
    ...(props.body.search
      ? {
          OR: [
            { title: { contains: props.body.search } },
            { body: { contains: props.body.search } },
          ],
        }
      : undefined),
  };

  const orderBy = {
    [props.body.order_by ?? "created_at"]: props.body.order_direction ?? "desc",
  } as const;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_question_answers.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_question_answers.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((answer) => ({
      id: answer.id,
      title: answer.title,
      created_at: toISOStringSafe(answer.created_at),
      shopping_mall_customer_question_id:
        answer.shopping_mall_customer_question_id,
      shopping_mall_seller_id: answer.shopping_mall_seller_id,
    })),
  };
}
