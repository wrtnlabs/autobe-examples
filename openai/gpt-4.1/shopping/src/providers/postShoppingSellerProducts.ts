import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";
import { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingProduct.ICreate;
}): Promise<IShoppingProduct> {
  const now = toISOStringSafe(new Date());

  // Check for unique code
  const existing = await MyGlobal.prisma.shopping_products.findFirst({
    where: { code: props.body.code },
  });
  if (existing) {
    throw new HttpException("Duplicate product code.", 409);
  }

  // Create
  const created = await MyGlobal.prisma.shopping_products.create({
    data: {
      id: v4(),
      shopping_seller_id: props.seller.id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description,
      main_image_uri: props.body.main_image_uri,
      status: props.body.status,
      business_status: props.body.business_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Seller summary (always present)
  const sellerRow = await MyGlobal.prisma.shopping_sellers.findUnique({
    where: { id: props.seller.id },
  });
  if (!sellerRow) {
    throw new HttpException("Seller not found.", 404);
  }
  const sellerSummary: IShoppingSeller.ISummary = {
    id: sellerRow.id,
    display_name: sellerRow.display_name,
    status: sellerRow.status,
  };

  return {
    id: created.id,
    shopping_seller_id: created.shopping_seller_id,
    code: created.code,
    name: created.name,
    description: created.description,
    main_image_uri: created.main_image_uri ?? undefined,
    status: created.status,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    seller: sellerSummary,
    categories: [],
    skus: [],
    images: [],
    tags: [],
    attributes: [],
  };
}
