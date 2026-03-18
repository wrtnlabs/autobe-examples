import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProductVariantSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.productVariantId
      ? {
          shopping_mall_product_variant_id: props.body.productVariantId,
        }
      : null),
    ...(props.body.code
      ? {
          code: {
            contains: props.body.code,
            mode: "insensitive",
          },
        }
      : null),
    ...(props.body.name
      ? {
          name: {
            contains: props.body.name,
            mode: "insensitive",
          },
        }
      : null),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom
              ? {
                  gte: new globalThis.Date(props.body.createdAtFrom),
                }
              : null),
            ...(props.body.createdAtTo
              ? {
                  lte: new globalThis.Date(props.body.createdAtTo),
                }
              : null),
          },
        }
      : null),
    ...(props.body.isAvailable !== undefined
      ? {
          is_available: props.body.isAvailable,
        }
      : null),
    ...(props.body.variantStatus
      ? {
          variant_status: props.body.variantStatus,
        }
      : null),
  } satisfies Prisma.shopping_mall_product_variant_snapshotsWhereInput;
  const [items, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: whereInput,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        price: true,
        currency: true,
        is_available: true,
        variant_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(items, async (it) => {
      return {
        id: it.id,
        code: it.code,
        name: it.name,
        price: it.price,
        currency: it.currency,
        is_available: it.is_available,
        variant_status: it.variant_status,
        created_at: toISOStringSafe(it.created_at),
        updated_at: toISOStringSafe(it.updated_at),
        deleted_at: it.deleted_at ? toISOStringSafe(it.deleted_at) : null,
        productVariant:
          await ShoppingMallProductVariantAtSummaryTransformer.transform(
            it.productVariant,
          ),
      } satisfies IShoppingMallProductVariantSnapshot.ISummary;
    }),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIShoppingMallProductVariantSnapshot.ISummary;
}
