import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_admin_promotion_request } from "../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Generate a random administrator promotion request via the API for E2E testing.
 *
 * Prepares random promotion request data using the prepare function with a randomized
 * reason text, then calls the seller admin promotion requests creation endpoint. The
 * request is submitted on behalf of an authenticated seller account, and the system
 * automatically determines the actor type from the authenticated user's role.
 *
 * This function supports test customization through the optional body parameter.
 * When specific reason text is needed for test scenarios, provide it via the
 * props.body.reason property.
 *
 * @param connection - API connection information with authentication headers
 * @param props - Optional parameters for test customization
 * @param props.body - Optional partial creation data to override default random values
 * @returns The created IShoppingMallAdminPromotionRequest entity with pending status
 */
export async function generate_random_shopping_mall_seller_admin_promotion_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdminPromotionRequest.ICreate>;
  },
): Promise<IShoppingMallAdminPromotionRequest> {
  const prepared: IShoppingMallAdminPromotionRequest.ICreate =
    prepare_random_shopping_mall_admin_promotion_request(props.body);
  const result: IShoppingMallAdminPromotionRequest =
    await api.functional.shoppingMall.seller.admin_promotion_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
