import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IUpdateOption;
}): Promise<IEcommerceMallProductVariant.ISummary> {
  const { seller, productId, variantId, body } = props;
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
  });
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: variantId,
        product_id: productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku: true,
        options: true,
        base_price: true,
        sale_price: true,
        stock_quantity: true,
        reserved_quantity: true,
        status: true,
        sort_order: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product_id: true,
      },
    });
  const operations = body.operations;
  if (operations.length === 0) {
    throw new HttpException("Operations array cannot be empty", 400);
  }
  const processedOperations = new Set<string>();
  for (const operation of operations) {
    if (processedOperations.has(operation.key)) {
      throw new HttpException("Duplicate option keys in request", 400);
    }
    processedOperations.add(operation.key);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const operation of operations) {
      switch (operation.action) {
        case "add": {
          await tx.ecommerce_mall_product_variant_options.create({
            data: {
              id: v4(),
              product_variant_id: variantId,
              key: operation.key,
              value: operation.value,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
          break;
        }
        case "update": {
          await tx.ecommerce_mall_product_variant_options.update({
            where: {
              product_variant_id_key: {
                product_variant_id: variantId,
                key: operation.key,
              },
              deleted_at: null,
            },
            data: {
              value: operation.value,
              updated_at: new Date(),
            },
          });
          break;
        }
        case "remove": {
          await tx.ecommerce_mall_product_variant_options.update({
            where: {
              product_variant_id_key: {
                product_variant_id: variantId,
                key: operation.key,
              },
              deleted_at: null,
            },
            data: {
              deleted_at: new Date(),
            },
          });
          break;
        }
      }
    }
  });
  const variantOptions =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findMany({
      where: {
        product_variant_id: variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product_variant_id: true,
      },
    });
  const optionsMap = variantOptions.reduce<{
    [key: string]: string;
  }>((acc, option) => {
    acc[option.key] = option.value;
    return acc;
  }, {});
  const updatedVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.update({
      where: {
        id: variantId,
      },
      data: {
        options: JSON.stringify(optionsMap),
        updated_at: new Date(),
      },
      select: {
        id: true,
        sku: true,
        options: true,
        base_price: true,
        sale_price: true,
        stock_quantity: true,
        reserved_quantity: true,
        status: true,
        sort_order: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.create({
    data: {
      id: v4(),
      product_id: productId,
      product_variant_id: variantId,
      sku_code: updatedVariant.sku,
      options: updatedVariant.options,
      price: updatedVariant.base_price,
      stock_quantity: updatedVariant.stock_quantity,
      status: updatedVariant.status,
      created_at: new Date(),
    },
  });
  const result =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: variantId,
      },
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    });
  return await EcommerceMallProductVariantAtSummaryTransformer.transform(
    result,
  );
}
