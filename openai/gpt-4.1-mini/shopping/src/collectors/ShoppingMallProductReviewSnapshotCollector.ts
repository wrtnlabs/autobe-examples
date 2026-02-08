import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date): string {
  return date.toISOString();
}
export namespace ShoppingMallProductReviewSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallProductReviewSnapshot.ICreate & {
      rating: number;
    };
    productReview: IEntity;
    orderItem: IEntity;
    productVariant: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      rating: props.body.rating,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      productReview: { connect: { id: props.productReview.id } },
      orderItem: { connect: { id: props.orderItem.id } },
      productVariant: { connect: { id: props.productVariant.id } },
    } satisfies Prisma.shopping_mall_product_review_snapshotsCreateInput;
  }
}
