import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { IShoppingMallAdministratorRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorAtSummaryTransformer } from "./ShoppingMallAdministratorAtSummaryTransformer";
import { ShoppingMallAdministratorRequestAtSummaryTransformer } from "./ShoppingMallAdministratorRequestAtSummaryTransformer";

export namespace ShoppingMallAdministratorRequestReviewTransformer {
  export type Payload =
    Prisma.shopping_mall_administrator_request_reviewsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        decision: true,
        created_at: true,
        administratorRequest:
          ShoppingMallAdministratorRequestAtSummaryTransformer.select(),
        administrator: ShoppingMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_administrator_request_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministratorRequestReview> {
    return {
      id: input.id,
      shoppingMallAdministratorRequest:
        await ShoppingMallAdministratorRequestAtSummaryTransformer.transform(
          input.administratorRequest,
        ),
      shoppingMallAdministrator:
        await ShoppingMallAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      decision: input.decision,
      created_at: input.created_at.toISOString(),
    };
  }
}
