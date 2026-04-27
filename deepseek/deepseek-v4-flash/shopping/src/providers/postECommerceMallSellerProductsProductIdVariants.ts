import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallProductVariantCollector } from "../collectors/ECommerceMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallProductVariantTransformer } from "../transformers/ECommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IECommerceMallProductVariant.ICreate;
}): Promise<IECommerceMallProductVariant> {
  // ---- Step 1: Verify seller exists, is approved, and not deleted ----
  const sellerRecord = await MyGlobal.prisma.e_commerce_mall_sellers.findFirst({
    where: { id: props.seller.id, deleted_at: null },
    select: { id: true, approval_status: true },
  });
  if (sellerRecord === null) {
    throw new HttpException("Seller not found", 404);
  }
  if (sellerRecord.approval_status !== "approved") {
    throw new HttpException(
      "Seller is not approved. Administrator approval is required before selling.",
      403,
    );
  }
  // ---- Step 2: Verify seller is not suspended ----
  const latestSuspensionLog =
    await MyGlobal.prisma.e_commerce_mall_seller_suspension_logs.findFirst({
      where: { e_commerce_mall_seller_id: props.seller.id },
      orderBy: { created_at: "desc" },
      select: { action: true },
    });
  if (latestSuspensionLog?.action === "suspend") {
    throw new HttpException("Seller is suspended", 403);
  }
  // ---- Step 3: Find product and verify ownership ----
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // ---- Step 4: Check SKU uniqueness globally ----
  const existingSku =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findUnique({
      where: { sku_code: props.body.sku_code },
      select: { id: true },
    });
  if (existingSku !== null) {
    throw new HttpException("SKU code already exists", 409);
  }
  // ---- Step 5: Check option combination uniqueness for the same product ----
  const existingVariants =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findMany({
      where: {
        e_commerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        options: {
          where: { deleted_at: null },
          select: { key: true, value: true },
        },
      },
    });
  const newOptionPairs = props.body.options.map((o) => ({
    key: o.key,
    value: o.value,
  }));
  const hasDuplicateCombination = existingVariants.some((variant) => {
    const variantPairs = variant.options.map((o) => ({
      key: o.key,
      value: o.value,
    }));
    if (variantPairs.length !== newOptionPairs.length) {
      return false;
    }
    return variantPairs.every((vp) =>
      newOptionPairs.some((np) => np.key === vp.key && np.value === vp.value),
    );
  });
  if (hasDuplicateCombination) {
    throw new HttpException(
      "Variant with same option combination already exists for this product",
      409,
    );
  }
  // ---- Step 6: Create variant using collector and return transformer result ----
  const record = await MyGlobal.prisma.e_commerce_mall_product_variants.create({
    data: await ECommerceMallProductVariantCollector.collect({
      body: props.body,
      eCommerceMallProducts: { id: props.productId },
      eCommerceMallSellers: { id: props.seller.id },
      eCommerceMallSellerSessions: { id: props.seller.session_id },
    }),
    ...ECommerceMallProductVariantTransformer.select(),
  });
  return await ECommerceMallProductVariantTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSellerProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IECommerceMallProductVariant.ICreate;
// }): Promise<IECommerceMallProductVariant> {
//   const record = await MyGlobal.prisma.e_commerce_mall_product_variants.create({
//     data: await ECommerceMallProductVariantCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallProductVariantTransformer.select(),
//   });
//   return await ECommerceMallProductVariantTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------