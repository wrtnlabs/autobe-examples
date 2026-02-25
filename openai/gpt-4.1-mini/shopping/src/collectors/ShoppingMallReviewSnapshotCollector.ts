import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallReviewSnapshot.ICreate;
  }) {
    const id: string = (globalThis as any).v4();
    return {
      id,
      rating: props.body.rating,
      body: props.body.body ?? null,
      snapshot_created_at: new Date(props.body.snapshotCreatedAt),
      created_at: new Date(props.body.createdAt),
      updated_at: new Date(props.body.updatedAt),
      deleted_at: null,
      review: { connect: { id: props.body.shoppingMallProductReviewId } },
    } satisfies Prisma.shopping_mall_review_snapshotsCreateInput;
  }
}
