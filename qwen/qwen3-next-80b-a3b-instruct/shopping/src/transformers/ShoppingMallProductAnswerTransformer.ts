import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnswer";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAnswerTransformer {
  export type Payload = Prisma.shopping_mall_product_answersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        question: {
          select: {
            id: true,
            customer: true,
            is_approved: true,
            is_flagged: true,
            flag_reason: true,
            answer_status: true,
            ip_address: true,
            user_agent: true,
            moderator_id: true,
            moderator_note: true,
            is_anonymous: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_answersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductAnswer> {
    return {
      id: input.id,
      customer_id: input.question.customer?.id,
      product_question_id: input.question.id,
      content: input.body,
      created_at: toISOStringSafe(input.created_at),
      is_approved: input.question.is_approved,
      is_flagged: input.question.is_flagged,
      flag_reason: input.question.flag_reason ?? null,
      answer_status: input.question.answer_status,
      ip_address: input.question.ip_address,
      user_agent: input.question.user_agent,
      moderator_id: input.question.moderator_id ?? null,
      moderator_note: input.question.moderator_note ?? null,
      is_anonymous: input.question.is_anonymous ?? false,
    };
  }
}
