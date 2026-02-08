import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(
  date: Date | string | null | undefined,
): string | null {
  if (date == null) return null;
  if (typeof date === "string") return date;
  return date.toISOString();
}
export namespace ShoppingMallProductReviewCollector {
  export async function collect(props: {
    body: IShoppingMallProductReview.ICreate;
    customer: IEntity;
    orderItem: IEntity;
    productVariant: IEntity;
  }) {
    const id = v4();
    return {
      id,
      rating: (props.body as any).rating ?? null,
      body: (props.body as any).body ?? null,
      created_at: toISOStringSafe(new Date())!,
      updated_at: toISOStringSafe(new Date())!,
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      orderItem: { connect: { id: props.orderItem.id } },
      productVariant: { connect: { id: props.productVariant.id } },
    } satisfies Prisma.shopping_mall_product_reviewsCreateInput;
  }
}
