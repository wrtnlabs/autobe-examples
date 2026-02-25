import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceReviewCollector {
  export async function collect(props: {
    body: IEcommerceReview.ICreate;
    customer: IEntity;
    product: IEntity;
    orderItem: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      rating: props.body.rating,
      content: props.body.content ?? null,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      customer: { connect: { id: props.customer.id } },
      product: { connect: { id: props.product.id } },
      orderItem: { connect: { id: props.orderItem.id } },
      // HasMany relations - not creating reverse relations for new review
      votes: undefined,
      reports: undefined,
      reviewEdits: undefined,
      moderationActions: undefined,
      helpfulVotes: undefined,
      flags: undefined,
      // HasOne relation - no seller response for new review
      sellerResponse: undefined,
    } satisfies Prisma.ecommerce_reviewsCreateInput;
  }
}
