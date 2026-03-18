import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministratorRequestApplicantSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_administrator_request_applicant_seller } from "../prepare/prepare_random_shopping_mall_administrator_request_applicant_seller";

export async function generate_random_shopping_mall_administrator_administrator_requests_applicant_sellers_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallAdministratorRequestApplicantSeller.ICreate>
      | undefined;
    params: {
      administratorRequestId: string;
    };
  },
): Promise<IShoppingMallAdministratorRequestApplicantSeller> {
  const prepared: IShoppingMallAdministratorRequestApplicantSeller.ICreate =
    prepare_random_shopping_mall_administrator_request_applicant_seller(
      props.body,
    );
  return await api.functional.shoppingMall.administrator.administrator_requests.applicant_sellers.create(
    connection,
    {
      body: prepared,
      administratorRequestId: props.params.administratorRequestId,
    },
  );
}
