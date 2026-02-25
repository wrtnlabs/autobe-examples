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

export async function postShoppingMallCustomerSalesSaleIdReviews(props: {
  customer: CustomerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleReview.ICreate;
}): Promise<IShoppingMallSaleReview> {
  // Validate the sale exists
  await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
  });
  // Enforce one review per sale per customer
  const existingReview =
    await MyGlobal.prisma.shopping_mall_sale_reviews.findFirst({
      where: {
        shopping_mall_sale_id: props.saleId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (existingReview) {
    throw new HttpException("Customer has already reviewed this sale", 400);
  }
  // Prepare create input using collector
  const createInput = await ShoppingMallSaleReviewCollector.collect({
    body: {
      shoppingMallSaleId: props.saleId,
      shoppingMallCustomerId: props.customer.id,
      rating: props.body.rating,
      body: props.body.body,
    },
  });
  // Create review record
  const created = await MyGlobal.prisma.shopping_mall_sale_reviews.create({
    data: createInput,
    ...ShoppingMallSaleReviewTransformer.select(),
  });
  // Transform to response DTO
  return await ShoppingMallSaleReviewTransformer.transform(created);
}
