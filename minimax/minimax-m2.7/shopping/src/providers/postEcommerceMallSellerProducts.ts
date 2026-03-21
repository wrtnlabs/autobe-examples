import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
import { EcommerceMallProductCollector } from "../collectors/EcommerceMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.ICreate;
}): Promise<IEcommerceMallProduct> {
  // Verify category exists and is not soft-deleted
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      id: props.body.category_id,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  // Create product using collector for write side transformation
  const created = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: await EcommerceMallProductCollector.collect({
      body: props.body,
      ecommerceMallSellers: { id: props.seller.id },
      ecommerceMallSellerSessions: { id: props.seller.session_id },
    }),
  });
  // Fetch the seller profile for the response
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  // Build and return the product response
  const response: IEcommerceMallProduct = {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description,
    base_price: created.base_price,
    seller: {
      id: props.seller.id,
      name: sellerProfile?.name ?? "",
      description: sellerProfile?.description ?? "",
      logo_uri: sellerProfile?.logo_uri ?? null,
      seller: {
        id: props.seller.id,
        email: "",
        approval_status: "approved",
        created_at: created.created_at.toISOString(),
        profile: {
          id: sellerProfile?.id ?? ("" as string & tags.Format<"uuid">),
          name: sellerProfile?.name ?? "",
          description: sellerProfile?.description ?? "",
          logo_uri: sellerProfile?.logo_uri ?? null,
          seller: {
            id: props.seller.id,
            email: "",
            approval_status: "approved",
            created_at: created.created_at.toISOString(),
            profile: undefined as unknown as IEcommerceMallSellerProfile,
          },
          created_at:
            sellerProfile?.created_at?.toISOString() ??
            created.created_at.toISOString(),
          updated_at:
            sellerProfile?.updated_at?.toISOString() ??
            created.updated_at.toISOString(),
          deleted_at: sellerProfile?.deleted_at?.toISOString() ?? null,
        },
      },
      created_at:
        sellerProfile?.created_at?.toISOString() ??
        created.created_at.toISOString(),
      updated_at:
        sellerProfile?.updated_at?.toISOString() ??
        created.updated_at.toISOString(),
      deleted_at: sellerProfile?.deleted_at?.toISOString() ?? null,
    },
    category: {
      id: category.id,
      name: category.name,
      description: category.description ?? undefined,
    },
    product_images: [],
    variants: [],
    reviews: [],
    average_rating: 0,
    reviews_count: 0 as number & tags.Type<"int32">,
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
    deleted_at: null,
  };
  return typia.assert<IEcommerceMallProduct>(response);
}
