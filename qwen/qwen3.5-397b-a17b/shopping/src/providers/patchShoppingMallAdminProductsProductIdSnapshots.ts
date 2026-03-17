import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProductsProductIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  const whereInput: Prisma.shopping_mall_product_snapshotsWhereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.snapshotAtFrom && {
      snapshot_at: { gte: new Date(props.body.snapshotAtFrom) },
    }),
    ...(props.body.snapshotAtTo && {
      snapshot_at: { lte: new Date(props.body.snapshotAtTo) },
    }),
    ...(props.body.name && {
      name: { contains: props.body.name, mode: "insensitive" },
    }),
  } satisfies Prisma.shopping_mall_product_snapshotsWhereInput;
  const orderByInput = (() => {
    if (!props.body.sort) {
      return { snapshot_at: "desc" as const };
    }
    const [field, direction] = props.body.sort.split(",");
    const dir = direction === "asc" ? ("asc" as const) : ("desc" as const);
    if (field === "snapshot_at") {
      return { snapshot_at: dir };
    }
    if (field === "created_at") {
      return { created_at: dir };
    }
    if (field === "name") {
      return { name: dir };
    }
    return { snapshot_at: "desc" as const };
  })() satisfies Prisma.shopping_mall_product_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_product_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      base_price: true,
      snapshot_at: true,
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          parent: {
            select: {
              id: true,
              name: true,
              description: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                },
              },
              created_at: true,
            },
          },
          created_at: true,
        },
      } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
      snapshotBy: {
        select: {
          id: true,
          email: true,
          shop_name: true,
          shop_description: true,
          logo_image_url: true,
          approval_status: true,
          suspended: true,
          created_at: true,
          approvedByAdmin: {
            select: {
              id: true,
              email: true,
              grade: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      } satisfies Prisma.shopping_mall_sellersFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_product_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((snapshot) => {
      const transformCategory = (
        cat: (typeof data)[number]["category"],
      ): IShoppingMallCategory.ISummary => ({
        id: cat.id,
        name: cat.name,
        description: cat.description ?? undefined,
        parent: cat.parent
          ? {
              id: cat.parent.id,
              name: cat.parent.name,
              description: cat.parent.description ?? undefined,
              parent: cat.parent.parent
                ? {
                    id: cat.parent.parent.id,
                    name: cat.parent.parent.name,
                    description: cat.parent.parent.description ?? undefined,
                    created_at: cat.parent.parent.created_at.toISOString(),
                  }
                : null,
              created_at: cat.parent.created_at.toISOString(),
            }
          : null,
        created_at: cat.created_at.toISOString(),
      });
      const transformSeller = (
        seller: (typeof data)[number]["snapshotBy"],
      ): IShoppingMallSeller.ISummary => ({
        id: seller.id,
        email: seller.email,
        shop_name: seller.shop_name,
        shop_description: seller.shop_description ?? null,
        logo_image_url: seller.logo_image_url ?? null,
        approval_status: seller.approval_status as
          | "PENDING"
          | "APPROVED"
          | "REJECTED",
        suspended: seller.suspended,
        created_at: seller.created_at.toISOString(),
        approvedByAdmin: seller.approvedByAdmin
          ? {
              id: seller.approvedByAdmin.id,
              email: seller.approvedByAdmin.email,
              grade: seller.approvedByAdmin.grade,
              created_at: seller.approvedByAdmin.created_at.toISOString(),
              updated_at: seller.approvedByAdmin.updated_at.toISOString(),
              deleted_at: seller.approvedByAdmin.deleted_at
                ? seller.approvedByAdmin.deleted_at.toISOString()
                : null,
            }
          : null,
      });
      return {
        id: snapshot.id,
        name: snapshot.name,
        base_price: snapshot.base_price,
        snapshot_at: snapshot.snapshot_at.toISOString(),
        category: transformCategory(snapshot.category),
        seller: transformSeller(snapshot.snapshotBy),
      };
    }),
  };
}
