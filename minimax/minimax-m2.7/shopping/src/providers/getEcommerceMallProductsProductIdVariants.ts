import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariant[]> {
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        sku_code: true,
        price: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        optionValues: {
          select: {
            id: true,
            key: true,
            value: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  return variants.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    sku_code: item.sku_code,
    price: item.price !== null ? item.price : undefined,
    quantity: item.quantity satisfies number as number,
    optionValues: item.optionValues.map((ov) => ({
      id: ov.id as string & tags.Format<"uuid">,
      key: ov.key,
      value: ov.value,
      variant: {
        id: item.id as string & tags.Format<"uuid">,
        sku_code: item.sku_code,
        price: item.price ?? undefined,
        quantity: item.quantity satisfies number as number,
        optionValues: [],
        created_at: item.created_at.toISOString() as string &
          tags.Format<"date-time">,
      },
      created_at: ov.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: ov.updated_at.toISOString() as string &
        tags.Format<"date-time">,
    })),
    created_at: item.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: item.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: item.deleted_at?.toISOString() ?? null,
  }));
}
