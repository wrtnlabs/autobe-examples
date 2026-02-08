import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleSpecificationCollector } from "../collectors/ShoppingMallSaleSpecificationCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSaleSpecifications(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleSpecification.ICreate;
}): Promise<IShoppingMallSaleSpecification> {
  const { seller, body } = props;
  const specification_key = ((body as any).specification_key ?? "").trim();
  if (specification_key === "") {
    throw new HttpException(
      "specification_key must be a non-empty string",
      400,
    );
  }
  const specification_value = ((body as any).specification_value ?? "").trim();
  if (specification_value === "") {
    throw new HttpException(
      "specification_value must be a non-empty string",
      400,
    );
  }
  if (
    typeof (body as any).shoppingMallSaleId !== "string" ||
    (body as any).shoppingMallSaleId.trim() === ""
  ) {
    throw new HttpException("shoppingMallSaleId must be provided", 400);
  }
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: (body as any).shoppingMallSaleId },
    select: { id: true, seller_id: true },
  });
  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }
  if (sale.seller_id !== seller.id) {
    throw new HttpException("Forbidden: sale does not belong to seller", 403);
  }
  const data = await ShoppingMallSaleSpecificationCollector.collect({
    body: {
      specification_key: specification_key,
      specification_value: specification_value,
      shoppingMallSaleId: (body as any).shoppingMallSaleId,
    },
  });
  const created =
    await MyGlobal.prisma.shopping_mall_sale_specifications.create({
      data,
    });
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_sale_id: created.shopping_mall_sale_id as string &
      tags.Format<"uuid">,
    specification_key: created.specification_key,
    specification_value: created.specification_value,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      created.deleted_at === null
        ? null
        : (toISOStringSafe(created.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
