import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceReviewCollector } from "../collectors/EcommerceReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceReviewTransformer } from "../transformers/EcommerceReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceReview.ICreate;
}): Promise<IEcommerceReview> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
      where: {
        id: props.body.orderItemId,
        ecommerce_order_id: props.customer.id,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered before reviewing",
      403,
    );
  }
  const created = await MyGlobal.prisma.ecommerce_reviews.create({
    data: await EcommerceReviewCollector.collect({
      body: props.body,
      ecommerceCustomers: { id: props.customer.id },
    }),
    ...EcommerceReviewTransformer.select(),
  });
  return await EcommerceReviewTransformer.transform(created);
}
