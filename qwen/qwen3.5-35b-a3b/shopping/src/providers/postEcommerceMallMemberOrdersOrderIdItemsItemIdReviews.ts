import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
import { IEcommerceMallCustomerReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReviewSnapshot";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCustomerReviewCollector } from "../collectors/EcommerceMallCustomerReviewCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallCustomerReviewTransformer } from "../transformers/EcommerceMallCustomerReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallMemberOrdersOrderIdItemsItemIdReviews(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCustomerReview.ICreate;
}): Promise<IEcommerceMallCustomerReview> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: { id: props.itemId },
      include: {
        productVariant: { select: { product_id: true } },
      },
    });
  if (orderItem.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException("Order ID mismatch", 404);
  }
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: { id: props.orderId },
    select: { ecommerce_mall_member_id: true },
  });
  if (order.ecommerce_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item is not delivered yet", 400);
  }
  const existingReview =
    await MyGlobal.prisma.ecommerce_mall_customer_reviews.findFirst({
      where: {
        customer_id: props.member.id,
        product_id: orderItem.productVariant.product_id,
        order_id: props.orderId,
        deleted_at: null,
      },
    });
  if (existingReview) {
    throw new HttpException(
      "Review already exists for this product in this order",
      409,
    );
  }
  const product_id = orderItem.productVariant.product_id;
  const created = await MyGlobal.prisma.ecommerce_mall_customer_reviews.create({
    data: await EcommerceMallCustomerReviewCollector.collect({
      body: props.body,
      ecommerceMallOrders: { id: props.orderId },
      ecommerceMallOrderItems: { id: props.itemId },
      ecommerceMallMembers: { id: props.member.id },
    }),
    ...EcommerceMallCustomerReviewTransformer.select(),
  });
  const productReviewStats =
    await MyGlobal.prisma.ecommerce_mall_product_review_stats.findUnique({
      where: { ecommerce_mall_product_id: product_id },
      select: {
        id: true,
        review_count: true,
        average_rating: true,
      },
    });
  if (productReviewStats) {
    const newReviewCount: number & tags.Type<"int32"> =
      productReviewStats.review_count + 1;
    const newAverage: number =
      Math.round(
        (((productReviewStats.average_rating ?? 0) *
          productReviewStats.review_count +
          props.body.rating) /
          newReviewCount) *
          100,
      ) / 100;
    await MyGlobal.prisma.ecommerce_mall_product_review_stats.update({
      where: { id: productReviewStats.id },
      data: {
        review_count: { increment: 1 },
        average_rating: newAverage,
      },
    });
    switch (props.body.rating) {
      case 1:
        await MyGlobal.prisma.ecommerce_mall_product_review_stats.update({
          where: { id: productReviewStats.id },
          data: { rating_1_count: { increment: 1 } },
        });
        break;
      case 2:
        await MyGlobal.prisma.ecommerce_mall_product_review_stats.update({
          where: { id: productReviewStats.id },
          data: { rating_2_count: { increment: 1 } },
        });
        break;
      case 3:
        await MyGlobal.prisma.ecommerce_mall_product_review_stats.update({
          where: { id: productReviewStats.id },
          data: { rating_3_count: { increment: 1 } },
        });
        break;
      case 4:
        await MyGlobal.prisma.ecommerce_mall_product_review_stats.update({
          where: { id: productReviewStats.id },
          data: { rating_4_count: { increment: 1 } },
        });
        break;
      case 5:
        await MyGlobal.prisma.ecommerce_mall_product_review_stats.update({
          where: { id: productReviewStats.id },
          data: { rating_5_count: { increment: 1 } },
        });
        break;
    }
  } else {
    const now = new Date();
    await MyGlobal.prisma.ecommerce_mall_product_review_stats.create({
      data: {
        id: v4(),
        ecommerce_mall_product_id: product_id,
        review_count: 1,
        average_rating: props.body.rating,
        rating_1_count: props.body.rating === 1 ? 1 : 0,
        rating_2_count: props.body.rating === 2 ? 1 : 0,
        rating_3_count: props.body.rating === 3 ? 1 : 0,
        rating_4_count: props.body.rating === 4 ? 1 : 0,
        rating_5_count: props.body.rating === 5 ? 1 : 0,
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
      },
    });
  }
  return await EcommerceMallCustomerReviewTransformer.transform(created);
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
// import { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
// import { IEcommerceMallCustomerReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReviewSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallMemberOrdersOrderIdItemsItemIdReviews(props: {
//   member: MemberPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCustomerReview.ICreate;
// }): Promise<IEcommerceMallCustomerReview> {
//   const record = await MyGlobal.prisma.ecommerce_mall_customer_reviews.create({
//     data: await EcommerceMallCustomerReviewCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCustomerReviewTransformer.select(),
//   });
//   return await EcommerceMallCustomerReviewTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------