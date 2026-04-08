import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_seller_approval_request } from "../prepare/prepare_random_ecommerce_mall_seller_approval_request";

/**
 * Generate a random seller approval request via the API for E2E testing.
 *
 * Prepares random seller approval request data using the prepare function, then calls the creation endpoint to submit a seller's reason for wanting to join the platform. The request enters a pending state for administrator review.
 */
export async function generate_random_ecommerce_mall_seller_seller_approval_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSellerApprovalRequest.ICreate>;
  },
): Promise<IEcommerceMallSellerApprovalRequest> {
  const prepared: IEcommerceMallSellerApprovalRequest.ICreate =
    prepare_random_ecommerce_mall_seller_approval_request(props.body);
  const result: IEcommerceMallSellerApprovalRequest =
    await api.functional.ecommerceMall.seller.seller_approval_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
