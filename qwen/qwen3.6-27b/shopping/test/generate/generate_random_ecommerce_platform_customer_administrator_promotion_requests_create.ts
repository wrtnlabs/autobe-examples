import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";

/**
 * Generate a random administrator promotion request via the API for E2E testing.
 *
 * Prepares random promotion request data using the prepare function, then calls the creation endpoint
 * to submit a request to become a platform administrator. The request includes the actor type
 * (customer or seller) and a written justification, entering "pending" status awaiting review
 * by a super administrator.
 */
export async function generate_random_ecommerce_platform_customer_administrator_promotion_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate>;
  },
): Promise<IEcommercePlatformAdministratorPromotionRequestOfCustomer> {
  const prepared: IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate =
    prepare_random_ecommerce_platform_administrator_promotion_request_of_customer(
      props.body,
    );
  const result: IEcommercePlatformAdministratorPromotionRequestOfCustomer =
    await api.functional.ecommercePlatform.customer.administrator_promotion_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
