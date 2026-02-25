import { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceReviewModerationActionCollector {
  export async function collect(props: {
    body: IEcommerceReviewModerationAction.ICreate;
    administrator: IEntity;
    review: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      action_type: props.body.action_type,
      reason: props.body.reason,
      status: props.body.status,
      additional_notes: props.body.additional_notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      administrator: { connect: { id: props.administrator.id } },
      review: { connect: { id: props.review.id } },
    } satisfies Prisma.ecommerce_review_moderation_actionsCreateInput;
  }
}
