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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberProductVariantSnapshots(props: {
  member: MemberPayload;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereVisibility = {
    party_type: "member",
    party_id: props.member.id,
    can_view: true,
    deleted_at: null,
  };
  const where = {
    deleted_at: null,
    ...(props.body.productVariantId
      ? { shopping_mall_product_variant_id: props.body.productVariantId }
      : null),
    ...(props.body.code ? { code: { contains: props.body.code } } : null),
    ...(props.body.name ? { name: { contains: props.body.name } } : null),
    ...(props.body.createdAtFrom || props.body.createdAtTo
      ? {
          created_at: {
            ...(props.body.createdAtFrom
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : null),
    ...(props.body.isAvailable !== undefined
      ? { is_available: props.body.isAvailable }
      : null),
    ...(props.body.variantStatus !== undefined
      ? { variant_status: props.body.variantStatus }
      : null),
    shopping_mall_snapshot_parties: {
      some: {
        ...whereVisibility,
      },
    },
  };
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where,
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
        shopping_mall_product_variant_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({ where }),
  ]);
  return {
    data: items.map((it) => ({
      id: it.id,
      code: it.code,
      name: it.name,
      price: it.price,
      currency: it.currency,
      is_available: it.is_available,
      variant_status: it.variant_status,
      productVariant: null as any,
      created_at: toISOStringSafe(it.created_at),
      updated_at: toISOStringSafe(it.updated_at),
      deleted_at: it.deleted_at ? toISOStringSafe(it.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
