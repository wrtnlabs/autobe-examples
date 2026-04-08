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
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceOrderItemAtSummaryTransformer } from "./EcommerceOrderItemAtSummaryTransformer";
import { EcommerceProductAtSummaryTransformer } from "./EcommerceProductAtSummaryTransformer";

export namespace EcommerceReviewTransformer {
  export type Payload = Prisma.ecommerce_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        orderItem: EcommerceOrderItemAtSummaryTransformer.select(),
        product: EcommerceProductAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_review_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_reviewsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceReview> {
    return {
      id: input.id,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      orderItem: await EcommerceOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      product: await EcommerceProductAtSummaryTransformer.transform(
        input.product,
      ),
      rating: input.rating,
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceReview;
  }
}
