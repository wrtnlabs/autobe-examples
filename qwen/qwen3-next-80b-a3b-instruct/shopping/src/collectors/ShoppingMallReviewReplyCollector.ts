import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewReplyCollector {
  export async function collect(props: {
    body: IShoppingMallReviewReply.ICreate;
    shoppingMallReview: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: null,
      body: props.body.reply_content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      review: {
        connect: { id: props.shoppingMallReview.id },
      },
      seller: {
        connect: { id: props.shoppingMallCustomers.id },
      },
    } satisfies Prisma.shopping_mall_review_repliesCreateInput;
  }
}
