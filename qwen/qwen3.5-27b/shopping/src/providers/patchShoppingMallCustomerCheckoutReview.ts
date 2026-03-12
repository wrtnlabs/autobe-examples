import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCheckoutReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutReview";
import { IShoppingMallCheckoutReviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutReviewItem";
import { IShoppingMallCheckoutShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckoutShippingAddress";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

/**
 * Review order details before placement during the checkout process.
 *
 * Cannot implement: Schema missing shopping_mall_addresses, shopping_mall_products, shopping_mall_product_variants, shopping_mall_product_images required by API.
 */
export async function patchShoppingMallCustomerCheckoutReview(props: {
  customer: CustomerPayload;
  body: IShoppingMallCheckoutReview.IRequest;
}): Promise<IShoppingMallCheckoutReview.ISummary> {
  return typia.random<IShoppingMallCheckoutReview.ISummary>();
}
