import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallWishlistTransformer } from "../transformers/EcommerceMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMemberWishlistsWishlistId(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallWishlist> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findFirstOrThrow({
      where: {
        id: props.wishlistId,
        deleted_at: null,
        customer_id: props.member.id,
      },
      ...EcommerceMallWishlistTransformer.select(),
    });
  const itemsRecord =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
      where: {
        ecommerce_mall_wishlist_id: props.wishlistId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "asc",
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: {
                display_order: "asc",
              },
              take: 1,
            },
            variants: {
              where: {
                deleted_at: null,
              },
              select: {
                price: true,
                stock_quantity: true,
              },
            },
          },
        },
      },
    });
  const items: IEcommerceMallWishlistItem.ISummary[] = itemsRecord.map(
    (item) => {
      const variants = item.product.variants;
      const minPrice =
        variants.length > 0
          ? Math.min(
              ...variants.map((v: { price: number | null }) => v.price ?? 0),
            )
          : 0;
      const maxPrice =
        variants.length > 0
          ? Math.max(
              ...variants.map((v: { price: number | null }) => v.price ?? 0),
            )
          : 0;
      const isAvailable = variants.some(
        (v: { stock_quantity: number }) => v.stock_quantity > 0,
      );
      const mainImage =
        item.product.images.length > 0 ? item.product.images[0].image_url : "";
      return {
        id: item.id,
        ecommerceMallWishlist: {
          id: record.id,
          created_at: toISOStringSafe(record.created_at),
          updated_at: toISOStringSafe(record.updated_at),
          deleted_at: record.deleted_at
            ? toISOStringSafe(record.deleted_at)
            : null,
          customer: {
            id: record.customer.id,
            display_name: record.customer.display_name,
            email: record.customer.email,
            phone_number: record.customer.phone_number,
            created_at: toISOStringSafe(record.customer.created_at),
            updated_at: toISOStringSafe(record.customer.updated_at),
            deleted_at: record.customer.deleted_at
              ? toISOStringSafe(record.customer.deleted_at)
              : null,
          },
        },
        product: {
          name: item.product.name,
          mainImage,
          priceRange: {
            min: minPrice,
            max: maxPrice,
          },
          availabilityStatus: isAvailable ? "available" : "unavailable",
        },
        createdAt: toISOStringSafe(item.created_at),
      };
    },
  );
  return {
    id: record.id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    customer: {
      id: record.customer.id,
      display_name: record.customer.display_name,
      email: record.customer.email,
      phone_number: record.customer.phone_number,
      created_at: toISOStringSafe(record.customer.created_at),
      updated_at: toISOStringSafe(record.customer.updated_at),
      deleted_at: record.customer.deleted_at
        ? toISOStringSafe(record.customer.deleted_at)
        : null,
    },
    items,
  };
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
// import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMemberWishlistsWishlistId(props: {
//   member: MemberPayload;
//   wishlistId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallWishlist> {
//   const record = await MyGlobal.prisma.ecommerce_mall_wishlists.findFirstOrThrow({
//     ...EcommerceMallWishlistTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallWishlistTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------