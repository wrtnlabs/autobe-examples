import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshot.IAt> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        ecommerce_mall_seller_id: true,
        name: true,
        description: true,
        base_price: true,
        category_name: true,
        created_at: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            created_at: true,
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                created_at: true,
                profile: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logo_uri: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            profile: {
              select: {
                id: true,
                name: true,
                description: true,
                logo_uri: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  if (snapshot.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Snapshot not found", 404);
  }
  if (snapshot.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const sellerProfile = snapshot.seller.profile;
  if (!sellerProfile) {
    throw new HttpException("Seller profile not found", 404);
  }
  const sellerProfileSummary: IEcommerceMallSellerProfile = {
    id: sellerProfile.id,
    name: sellerProfile.name,
    description: sellerProfile.description,
    logo_uri: sellerProfile.logo_uri,
    seller: {
      id: snapshot.seller.id,
      email: snapshot.seller.email as string & tags.Format<"email">,
      approval_status: snapshot.seller.approval_status,
      created_at: toISOStringSafe(snapshot.seller.created_at),
      profile: null as unknown as IEcommerceMallSellerProfile,
    } satisfies IEcommerceMallSeller.ISummary,
    created_at: toISOStringSafe(sellerProfile.created_at),
    updated_at: toISOStringSafe(sellerProfile.updated_at),
    deleted_at: sellerProfile.deleted_at
      ? toISOStringSafe(sellerProfile.deleted_at)
      : null,
  };
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    base_price: snapshot.base_price,
    category_name: snapshot.category_name,
    created_at: toISOStringSafe(snapshot.created_at),
    product: {
      id: snapshot.product.id,
      name: snapshot.product.name,
      min_price: snapshot.product.base_price,
      max_price: snapshot.product.base_price,
      primary_image_url: "",
      seller_name: snapshot.product.seller.profile?.name ?? "",
      average_rating: 0,
      reviews_count: 0 as number & tags.Type<"int32">,
      created_at: toISOStringSafe(snapshot.product.created_at),
    } satisfies IEcommerceMallProduct.ISummary,
    seller: {
      id: snapshot.seller.id,
      email: snapshot.seller.email as string & tags.Format<"email">,
      approval_status: snapshot.seller.approval_status,
      created_at: toISOStringSafe(snapshot.seller.created_at),
      profile: sellerProfileSummary,
    } satisfies IEcommerceMallSeller.ISummary,
  };
}
