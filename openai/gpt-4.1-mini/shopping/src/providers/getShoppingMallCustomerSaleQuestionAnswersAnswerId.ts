import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
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

export async function getShoppingMallCustomerSaleQuestionAnswersAnswerId(props: {
  customer: CustomerPayload;
  answerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  const answer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUnique({
      where: { id: props.answerId },
      select: {
        id: true,
        shopping_mall_sale_question_id: true,
        seller_id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (answer === null) {
    throw new HttpException("Sale question answer not found", 404);
  }
  // Authorization: Assuming customer role can access any answer; implement more checks if needed
  return {
    id: answer.id,
    shopping_mall_sale_question_id: answer.shopping_mall_sale_question_id,
    seller_id: answer.seller_id,
    title: answer.title,
    body: answer.body,
    created_at: toISOStringSafe(answer.created_at),
    updated_at: toISOStringSafe(answer.updated_at),
    deleted_at:
      answer.deleted_at === null ? null : toISOStringSafe(answer.deleted_at),
  };
}
