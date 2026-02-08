import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
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

export async function getShoppingMallAdministratorSaleQuestionsQuestionId(props: {
  administrator: AdministratorPayload;
  questionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleQuestion> {
  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUnique({
      where: { id: props.questionId },
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!question || question.deleted_at !== null) {
    throw new HttpException("Sale question not found", 404);
  }
  return {
    id: question.id,
    title: question.title,
    body: question.body,
    status: question.status,
    created_at: question.created_at,
    updated_at: question.updated_at,
    deleted_at: question.deleted_at,
  };
}
