import { IEcommerceMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallReviewImageCollector {
  export async function collect(props: {
    body: IEcommerceMallReviewImage.ICreate;
    ecommerceMallReviews: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      image_url: props.body.image_url,
      sort_order: 0,
      created_at: new Date(),
      updated_at: new Date(),
      review: { connect: { id: props.ecommerceMallReviews.id } },
    } satisfies Prisma.ecommerce_mall_review_imagesCreateInput;
  }
}
