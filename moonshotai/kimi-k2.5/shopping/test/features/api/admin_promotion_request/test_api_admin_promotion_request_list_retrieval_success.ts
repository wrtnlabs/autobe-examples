import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test the primary success path where a super administrator retrieves a filtered and paginated list of administrator promotion requests with default parameters.
 *
 * 1. Super administrator successfully authenticates via join operation
 * 2. Customer successfully authenticates via join operation
 * 3. Customer submits an admin promotion request to create test data
 * 4. Authenticated as superAdmin, call the PATCH endpoint with empty filter criteria to get all requests
 * 5. Validate the response contains a properly structured paginated result
 * 6. Verify the created promotion request exists in the data array
 */
export async function test_api_admin_promotion_request_list_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin setup via SDK join (no utility available for superAdmin join)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.com/join",
        referrer: "https://test.com",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Customer setup via utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Create promotion request as test data using utility
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 4. Retrieve promotion requests list as superAdmin with empty filters
  const result =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(result);
  // 5. Validate pagination structure
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is default 20", result.pagination.limit, 20);
  TestValidator.predicate("records count >= 1", result.pagination.records >= 1);
  TestValidator.predicate("pages count >= 1", result.pagination.pages >= 1);
  // 6. Validate data array contains the created request
  const foundRequest = result.data.find(
    (req) => req.id === promotionRequest.id,
  );
  TestValidator.predicate(
    "created promotion request exists in list",
    foundRequest !== undefined,
  );
  if (foundRequest) {
    TestValidator.equals(
      "request status matches",
      foundRequest.status,
      promotionRequest.status,
    );
    TestValidator.equals(
      "request reason matches",
      foundRequest.reason,
      promotionRequest.reason,
    );
  }
}
