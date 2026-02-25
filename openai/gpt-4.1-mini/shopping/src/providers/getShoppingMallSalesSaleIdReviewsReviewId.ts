import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleReviewTransformer } from "../transformers/ShoppingMallSaleReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSalesSaleIdReviewsReviewId(props: {
  saleId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleReview> {
  const recordRaw =
    await MyGlobal.prisma.shopping_mall_sale_reviews.findUniqueOrThrow({
      where: {
        id: props.reviewId,
      },
      ...ShoppingMallSaleReviewTransformer.select(),
    });
  // Helper function to convert Date fields to string recursively
  function convertDates(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (
        key === "created_at" ||
        key === "updated_at" ||
        key === "deleted_at"
      ) {
        if (val instanceof Date) {
          result[key] = toISOStringSafe(val);
        } else if (val === null) {
          result[key] = null;
        } else {
          result[key] = val;
        }
      } else if (Array.isArray(val)) {
        result[key] = val.map(convertDates);
      } else if (val && typeof val === "object") {
        result[key] = convertDates(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }
  const record = convertDates(recordRaw);
  return await ShoppingMallSaleReviewTransformer.transform(record);
}
