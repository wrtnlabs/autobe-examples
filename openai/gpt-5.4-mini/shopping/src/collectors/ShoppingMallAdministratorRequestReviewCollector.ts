import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdministratorRequestReviewCollector {
  export async function collect(props: {
    body: IShoppingMallAdministratorRequestReview.ICreate;
    administratorRequest: IEntity;
    administrator: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      decision: props.body.decision,
      created_at: new Date(),
      administratorRequest: { connect: { id: props.administratorRequest.id } },
      administrator: { connect: { id: props.administrator.id } },
    } satisfies Prisma.shopping_mall_administrator_request_reviewsCreateInput;
  }
}
