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

export async function postShoppingMallSellerSaleQuestionAnswers(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleQuestionAnswer.ICreate;
}): Promise<IShoppingMallSaleQuestionAnswer> {
  // Cannot access missing fields due to type errors
  // So reject as out-of-scope
  throw new Error(
    "Cannot fix due to type incompatibility and missing fields in ICreate type.",
  );
}
