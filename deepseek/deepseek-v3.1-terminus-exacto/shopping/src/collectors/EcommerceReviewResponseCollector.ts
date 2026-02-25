import { IEcommerceReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceReviewResponseCollector {
  export async function collect(props: {
    body: IEcommerceReviewResponse.ICreate;
    seller: IEntity;
    review: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      // Scalar fields
      id,
      body: props.body.body,
      created_at: now,
      updated_at: now,
      // BelongsTo relations
      seller: { connect: { id: props.seller.id } },
      review: { connect: { id: props.review.id } },
    } satisfies Prisma.ecommerce_review_responsesCreateInput;
  }
}
