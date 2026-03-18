import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequestApplicantSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_administrator_request_applicant_seller(
  input?:
    | DeepPartial<IShoppingMallAdministratorRequestApplicantSeller.ICreate>
    | undefined,
): IShoppingMallAdministratorRequestApplicantSeller.ICreate {
  return {
    shopping_mall_seller_id:
      input?.shopping_mall_seller_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
