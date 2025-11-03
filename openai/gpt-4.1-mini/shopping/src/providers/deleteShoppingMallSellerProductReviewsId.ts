import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductReviewsId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  // Due to missing seller ownership field in product schema, ownership check cannot be done
  // Hence, deletion is forbidden for all sellers to prevent unauthorized deletes
  throw new HttpException(
    "Forbidden: Cannot verify product ownership due to schema limitations",
    403,
  );

  // Alternative (not implemented): allow deletion without ownership check
  // await MyGlobal.prisma.shopping_mall_product_reviews.delete({ where: { id } });
}
