import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall administrator request creation data for E2E testing.
 *
 * Generates a complete IShoppingMallAdministratorRequest.ICreate with randomized values.
 * The reason field contains a justification text explaining why the user should be
 * granted administrator access to the shopping mall platform.
 */
export function prepare_random_shopping_mall_administrator_request(
  input?: DeepPartial<IShoppingMallAdministratorRequest.ICreate> | undefined,
): IShoppingMallAdministratorRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
