import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaq";

export async function getShoppingMallFaqsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallFaq> {
  const record = await MyGlobal.prisma.shopping_mall_faqs.findUnique({
    where: { id: props.id },
  });

  if (!record) {
    throw new HttpException("FAQ entry not found", 404);
  }

  return {
    id: record.id,
    question: record.question,
    answer: record.answer,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at
      ? toISOStringSafe(record.updated_at)
      : undefined,
  };
}
