import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewModerationLogCollector {
  export async function collect(props: {
    body: IShoppingMallReviewModerationLog.ICreate;
    review: IEntity; // from path parameter
    shoppingMallAdmins: IEntity; // from authorized actor
    shoppingMallAdminSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      action: props.body.decision,
      justification: props.body.reason,
      created_at: new Date(),
      review: {
        connect: { id: props.review.id },
      },
      moderator: {
        connect: { id: props.shoppingMallAdmins.id },
      },
    } satisfies Prisma.shopping_mall_review_moderation_logsCreateInput;
  }
}
