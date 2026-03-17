import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_admin_request(
  input?: DeepPartial<IShoppingMallAdminRequest.ICreate>,
): IShoppingMallAdminRequest.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  };
}
