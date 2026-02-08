import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSaleQuestionAnswersAnswerId(props: {
  administrator: AdministratorPayload;
  answerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  const record =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findUnique({
      where: { id: props.answerId },
    });
  if (!record) {
    throw new HttpException("Sale question answer not found", 404);
  }
  return {
    id: record.id,
    seller_id: record.seller_id,
    question_id: record.shopping_mall_sale_question_id,
    title: record.title,
    body: record.body,
    created_at: record.created_at ? toISOStringSafe(record.created_at) : null,
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
