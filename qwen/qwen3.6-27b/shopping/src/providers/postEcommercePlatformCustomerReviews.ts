import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformReviewTransformer } from "../transformers/EcommercePlatformReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformReview.IRequest;
}): Promise<IEcommercePlatformReview> {
  const productId = props.body.productId;
  const orderId = props.body.orderId;
  if (productId === undefined) {
    throw new HttpException("Product ID is required", 400);
  }
  if (orderId === undefined) {
    throw new HttpException("Order ID is required", 400);
  }
  await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
    where: {
      id: productId,
    },
    select: {
      id: true,
    },
  });
  const customerProfileRecord =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findFirstOrThrow(
      {
        where: {
          ecommerce_platform_customer_id: props.customer.id,
        },
        select: {
          id: true,
        },
      },
    );
  await MyGlobal.prisma.ecommerce_platform_orders.findUniqueOrThrow({
    where: {
      id: orderId,
      ecommerce_platform_customer_profile_id: customerProfileRecord.id,
      status: "delivered",
    },
    select: {
      id: true,
    },
  });
  const productVariantIds = (
    await MyGlobal.prisma.ecommerce_platform_product_variants.findMany({
      where: {
        ecommerce_platform_product_id: productId,
      },
      select: {
        id: true,
      },
    })
  ).map((v) => v.id);
  if (productVariantIds.length === 0) {
    throw new HttpException("Product has no variants", 400);
  }
  const deliveredOrderItem =
    await MyGlobal.prisma.ecommerce_platform_order_items.findFirst({
      where: {
        ecommerce_platform_order_id: orderId,
        ecommerce_platform_product_variant_id: {
          in: productVariantIds,
        },
        status: "delivered",
      },
      select: {
        id: true,
      },
    });
  if (deliveredOrderItem === null) {
    throw new HttpException("Order item not delivered", 412);
  }
  const existingReview =
    await MyGlobal.prisma.ecommerce_platform_reviews.findFirst({
      where: {
        ecommerce_platform_customer_id: props.customer.id,
        ecommerce_platform_product_id: productId,
        ecommerce_platform_order_id: orderId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existingReview !== null) {
    throw new HttpException(
      "Review already exists for this product and order",
      409,
    );
  }
  const rating = props.body.minRating ?? 5;
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.ecommerce_platform_reviews.create({
      data: {
        id: v4(),
        rating: rating,
        text_content: props.body.search,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        customer: {
          connect: {
            id: props.customer.id,
          },
        },
        product: {
          connect: {
            id: productId,
          },
        },
        order: {
          connect: {
            id: orderId,
          },
        },
      },
      ...EcommercePlatformReviewTransformer.select(),
    });
    return created;
  });
  return await EcommercePlatformReviewTransformer.transform(record);
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
// import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerReviews(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformReview.IRequest;
// }): Promise<IEcommercePlatformReview> {
//   const record = await MyGlobal.prisma.ecommerce_platform_reviews.findFirstOrThrow({
//     ...EcommercePlatformReviewTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformReviewTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------