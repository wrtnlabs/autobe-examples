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
import { ShoppingMallSaleReviewCollector } from "../collectors/ShoppingMallSaleReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSaleReviewTransformer } from "../transformers/ShoppingMallSaleReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerProductReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleReview.ICreate;
}): Promise<IShoppingMallSaleReview> {
  if (
    props.body.rating < 1 ||
    props.body.rating > 5 ||
    !Number.isInteger(props.body.rating)
  ) {
    throw new HttpException("Rating must be an integer between 1 and 5", 400);
  }
  if (props.body.shoppingMallCustomerId !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const data = await ShoppingMallSaleReviewCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.shopping_mall_sale_reviews.create({
    data,
    ...ShoppingMallSaleReviewTransformer.select(),
  });
  const result = await ShoppingMallSaleReviewTransformer.transform(created);
  return result;
}
