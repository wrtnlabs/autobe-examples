import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSaleQuestionAnswersAnswerId(props: {
  seller: SellerPayload;
  answerId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestionAnswer.IUpdate;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  const record =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUnique({
      where: { id: props.answerId },
    });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Answer not found", 404);
  }
  if (record.seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized", 403);
  }
  // Access properties with type assertion to any to bypass type errors
  const body = props.body as any;
  if (typeof body.title !== "string" || body.title.trim() === "") {
    throw new HttpException("Title must not be empty", 400);
  }
  if (typeof body.body !== "string" || body.body.trim() === "") {
    throw new HttpException("Body must not be empty", 400);
  }
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.update({
      where: { id: props.answerId },
      data: {
        title: body.title,
        body: body.body,
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    question_id: updated.shopping_mall_sale_question_id,
    seller_id: updated.seller_id,
    title: updated.title,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
