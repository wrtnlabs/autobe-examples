import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallProductReviews(props: {
  body: IShoppingMallProductReview.ICreate;
}): Promise<IShoppingMallProductReview> {
  throw new Error(
    "Cannot implement postShoppingMallProductReviews: missing customer ID, order item ID, and product variant ID in parameters.",
  );
}
