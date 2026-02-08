import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallCustomerSaleQuestionsQuestionId(props: {
  customer: CustomerPayload;
  questionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the question by ID to validate existence and ownership
  const question =
    await MyGlobal.prisma.shopping_mall_sale_questions.findUnique({
      where: { id: props.questionId },
      select: { shopping_mall_customer_id: true },
    });
  if (!question) {
    throw new HttpException("Question not found", 404);
  }
  // Check ownership: requester must be the authoring customer
  if (question.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform the deletion; cascades handle related entities
  await MyGlobal.prisma.shopping_mall_sale_questions.delete({
    where: { id: props.questionId },
  });
}
