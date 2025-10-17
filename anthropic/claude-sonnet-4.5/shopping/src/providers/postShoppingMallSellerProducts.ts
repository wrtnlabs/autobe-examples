import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const { seller, body } = props;

  // Validate authenticated seller exists and is active
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: seller.id,
      deleted_at: null,
      email_verified: true,
      account_status: "active",
      documents_verified: true,
    },
  });

  if (!sellerRecord) {
    throw new HttpException(
      "Unauthorized: Seller account not found or not active",
      403,
    );
  }

  // Find a valid active category for product assignment
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      deleted_at: null,
      is_active: true,
    },
  });

  if (!category) {
    throw new HttpException(
      "No active product categories available. Please contact administrator.",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const productId = v4() as string & tags.Format<"uuid">;

  // Create product with all required fields
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: productId,
      shopping_mall_category_id: category.id,
      shopping_mall_seller_id: seller.id,
      name: body.name,
      description: "",
      base_price: body.base_price,
      status: "draft",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description,
  };
}
