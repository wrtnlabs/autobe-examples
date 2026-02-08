import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
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

export async function putShoppingMallSellerSaleSpecificationsSpecId(props: {
  seller: SellerPayload;
  specId: string & tags.Format<"uuid">;
  body: Partial<{
    specification_key?: string;
    specification_value?: string;
  }>;
}): Promise<IShoppingMallSaleSpecification> {
  const existingSpec =
    await MyGlobal.prisma.shopping_mall_sale_specifications.findUnique({
      where: { id: props.specId },
      select: {
        id: true,
        shopping_mall_sale_id: true,
        specification_key: true,
        specification_value: true,
        created_at: true,
        updated_at: true,
        shoppingMallSale: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  if (!existingSpec) {
    throw new HttpException("Sale specification not found", 404);
  }
  // Access related seller id safely
  const sellerId = existingSpec.shoppingMallSale?.seller_id;
  if (sellerId !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Cast props.body to any to access possible properties for backward compatibility
  const body = props.body as Record<string, any>;
  if (
    typeof body.specification_key === "string" &&
    body.specification_key !== existingSpec.specification_key
  ) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_sale_specifications.findFirst({
        where: {
          shopping_mall_sale_id: existingSpec.shopping_mall_sale_id,
          specification_key: body.specification_key,
          NOT: { id: props.specId },
        },
      });
    if (duplicate) {
      throw new HttpException(
        "Duplicate specification key for the same sale",
        409,
      );
    }
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const updatedSpec = await tx.shopping_mall_sale_specifications.update({
      where: { id: props.specId },
      data: {
        specification_key:
          typeof body.specification_key === "string"
            ? body.specification_key
            : existingSpec.specification_key,
        specification_value:
          typeof body.specification_value === "string"
            ? body.specification_value
            : existingSpec.specification_value,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    return updatedSpec;
  });
  return {
    id: updated.id,
    shopping_mall_sale_id: updated.shopping_mall_sale_id,
    specification_key: updated.specification_key,
    specification_value: updated.specification_value,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
