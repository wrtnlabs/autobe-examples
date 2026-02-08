import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSellerSaleQuestionAnswersAnswerId(props: {
  seller: SellerPayload;
  answerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const answer =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUnique({
      where: { id: props.answerId },
      select: {
        id: true,
        deleted_at: true,
        seller_id: true,
      },
    });
  if (!answer || answer.deleted_at !== null) {
    throw new HttpException("Answer not found", 404);
  }
  if (answer.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_sale_question_answers.update({
    where: { id: props.answerId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
