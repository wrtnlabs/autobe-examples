import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformReviewCollector } from "../collectors/MallPlatformReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformReviewTransformer } from "../transformers/MallPlatformReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerOrderItemsOrderItemIdReview(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IMallPlatformReview.ICreate;
}): Promise<IMallPlatformReview> {
  const orderItem =
    await MyGlobal.prisma.mall_platform_order_items.findUniqueOrThrow({
      where: {
        id: props.orderItemId,
      },
      select: {
        id: true,
        status: true,
        mall_platform_order_id: true,
        mall_platform_product_variant_id: true,
        order: {
          select: {
            id: true,
            customer_id: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException("Review is allowed only after delivery", 400);
  }
  const existingReview = await MyGlobal.prisma.mall_platform_reviews.findFirst({
    where: {
      OR: [
        { order_item_id: orderItem.id },
        {
          product_id: orderItem.productVariant.product.id,
          orderItem: {
            order: {
              id: orderItem.order.id,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
  if (existingReview !== null) {
    throw new HttpException("Review already exists for this purchase", 409);
  }
  const created = await MyGlobal.prisma.mall_platform_reviews.create({
    data: await MallPlatformReviewCollector.collect({
      body: props.body,
      customer: {
        id: props.customer.id,
      },
      orderItem: {
        id: orderItem.id,
      },
      product: {
        id: orderItem.productVariant.product.id,
      },
    }),
    ...MallPlatformReviewTransformer.select(),
  });
  return await MallPlatformReviewTransformer.transform(created);
}
