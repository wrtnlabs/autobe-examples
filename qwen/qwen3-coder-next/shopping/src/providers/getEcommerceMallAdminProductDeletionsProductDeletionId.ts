import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallAdminProductDeletionsProductDeletionId(props: {
  admin: AdminPayload;
  productDeletionId: string;
}): Promise<IEcommerceMallProductDeletion> {
  const deletion =
    await MyGlobal.prisma.ecommerce_mall_product_deletions.findUniqueOrThrow({
      where: { id: props.productDeletionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            is_available: true,
            created_at: true,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                is_suspended: true,
                created_at: true,
              },
            },
            images: {
              where: { is_main: true, deleted_at: null },
              select: {
                id: true,
                image_url: true,
                sort_order: true,
                is_main: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
              take: 1,
            },
          },
        },
        admin: {
          select: { id: true, email: true, grade: true, created_at: true },
        },
      },
    });
  const mapProduct = (p: any) => ({
    id: p.id,
    name: p.name,
    base_price: p.base_price,
    is_available: p.is_available,
    created_at: toISOStringSafe(p.created_at),
    seller: {
      id: p.seller.id,
      shop_name: p.seller.shop_name,
      approval_status: p.seller.approval_status,
      is_suspended: p.seller.is_suspended,
      created_at: toISOStringSafe(p.seller.created_at),
    },
    main_image:
      p.images.length > 0
        ? {
            id: p.images[0].id,
            image_url: p.images[0].image_url,
            sort_order: p.images[0].sort_order,
            is_main: p.images[0].is_main,
            created_at: toISOStringSafe(p.images[0].created_at),
            updated_at: toISOStringSafe(p.images[0].updated_at),
            deleted_at: p.images[0].deleted_at?.toISOString() ?? null,
          }
        : {
            id: "00000000-0000-0000-0000-000000000000" as string &
              tags.Format<"uuid">,
            image_url: "",
            sort_order: 0,
            is_main: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          },
  });
  return {
    id: deletion.id,
    product_id: deletion.product_id,
    admin_id: deletion.admin_id,
    parent_deletion_request_id: deletion.parent_deletion_request_id,
    reason: deletion.reason,
    status: deletion.status as "pending" | "approved" | "rejected",
    responded_at: deletion.responded_at?.toISOString() ?? null,
    approval_notes: deletion.approval_notes,
    deleted_at: deletion.deleted_at?.toISOString() ?? null,
    created_at: deletion.created_at.toISOString(),
    updated_at: deletion.updated_at.toISOString(),
    product: mapProduct(deletion.product),
    admin: {
      id: deletion.admin.id,
      email: deletion.admin.email,
      grade: typia.assert<"regular" | "super">(deletion.admin.grade),
      created_at: deletion.admin.created_at.toISOString(),
    },
    parentRequest: null,
    followUpRequests: [],
  };
}
