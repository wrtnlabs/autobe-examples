import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallReviewImageCollector {
  export async function collect(props: {
    body: IShoppingMallReviewImage.ICreate;
    shoppingMallReviews: IEntity;
  }) {
    return {
      id: v4(),
      image_url: props.body.url,
      created_at: new Date(),
      updated_at: new Date(),
      review: {
        connect: { id: props.shoppingMallReviews.id },
      },
    } satisfies Prisma.shopping_mall_review_imagesCreateInput;
  }
}
