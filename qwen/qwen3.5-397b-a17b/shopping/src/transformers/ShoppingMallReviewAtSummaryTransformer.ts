import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallMemberAtSummaryTransformer } from "./ShoppingMallMemberAtSummaryTransformer";

export namespace ShoppingMallReviewAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_reviewsGetPayload<
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
        member: ShoppingMallMemberAtSummaryTransformer.select(),
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        order: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_review_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReview.ISummary> {
    return {
      id: input.id,
      rating: input.rating,
      content: input.content ?? undefined,
      author: await ShoppingMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallReview.ISummary;
  }
}
