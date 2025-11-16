import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaq";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerFaqs(props: {
  customer: CustomerPayload;
  body: IShoppingMallFaq.ICreate;
}): Promise<IShoppingMallFaq> {
  const created = await MyGlobal.prisma.shopping_mall_faqs.create({
    data: {
      id: v4() satisfies string as string & tags.Format<"uuid">,
      question: props.body.question,
      answer: props.body.answer,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    question: created.question,
    answer: created.answer,
    created_at: toISOStringSafe(created.created_at),
    updated_at:
      created.updated_at === null
        ? undefined
        : toISOStringSafe(created.updated_at),
  };
}
