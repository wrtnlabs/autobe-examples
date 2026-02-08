import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
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

export async function putShoppingMallCustomerSaleQuestionsQuestionId(props: {
  customer: CustomerPayload;
  questionId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestion.IUpdate;
}): Promise<IShoppingMallSaleQuestion> {
  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUnique({
      where: { id: props.questionId },
    });
  if (question === null) {
    throw new HttpException("Sale question not found", 404);
  }
  if (question.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only update your own question",
      403,
    );
  }
  const nowString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const body = props.body as any;
  const updated = await MyGlobal.prisma.shopping_mall_sale_questions.update({
    where: { id: props.questionId },
    data: {
      title: body.title,
      body: body.body,
      status: body.status,
      updated_at: nowString,
    },
  });
  return updated;
}
