import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdAttributesAttributeId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product ownership and attribute existence in a single operation
  const result =
    await MyGlobal.prisma.shopping_mall_product_attributes.deleteMany({
      where: {
        id: props.attributeId,
        shopping_mall_product_id: props.productId,
        product: {
          shopping_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
        deleted_at: null,
      },
    });

  if (result.count === 0) {
    throw new HttpException(
      "Product attribute not found or you do not have permission to delete it",
      404,
    );
  }
}
