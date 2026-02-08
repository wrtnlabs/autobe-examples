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
    review: IEntity;
  }) {
    const id = v4();
    const now = new Date();
    return {
      id,
      rating: 0,
      body: null,
      snapshot_created_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      review: { connect: { id: props.review.id } },
    } satisfies Prisma.shopping_mall_review_snapshotsCreateInput;
  }
}
