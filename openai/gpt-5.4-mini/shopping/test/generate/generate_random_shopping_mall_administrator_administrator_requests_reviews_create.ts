import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallAdministratorRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_administrator_request_review } from "../prepare/prepare_random_shopping_mall_administrator_request_review";

export async function generate_random_shopping_mall_administrator_administrator_requests_reviews_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallAdministratorRequestReview.ICreate>
      | undefined;
    params: {
      administratorRequestId: string;
    };
  },
): Promise<IShoppingMallAdministratorRequestReview> {
  const prepared: IShoppingMallAdministratorRequestReview.ICreate =
    prepare_random_shopping_mall_administrator_request_review(props.body);
  return await api.functional.shoppingMall.administrator.administrator_requests.reviews.create(
    connection,
    {
      body: prepared,
      administratorRequestId: props.params.administratorRequestId,
    },
  );
}
