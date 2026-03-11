import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_duplicate_pending_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account via utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>,
      password: "testPassword123",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create customer-specific connection for API calls
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResult.token.access,
    },
  };
  // 3. Submit first admin request via utility function
  const firstRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "First request for admin access to perform system maintenance tasks",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 4. Verify first request has pending status
  TestValidator.equals(
    "first request status is pending",
    firstRequest.request_status,
    "pending",
  );
  // 5. Attempt second admin request with different reason - should fail with business error
  await TestValidator.error(
    "second admin request fails when pending request exists",
    async () => {
      await api.functional.ecommerceMall.customer.admin_requests.create(
        customerConnection,
        {
          body: {
            reason:
              "Second request for admin access to handle escalated customer issues",
          } satisfies IEcommerceMallAdminRequestRequest.ICreate,
        },
      );
    },
  );
  // 6. Verify original pending request remains unchanged
  const customerConnection2: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResult.token.access,
    },
  };
  const verifyRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerConnection2,
      {
        body: {
          reason: "test",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(verifyRequest);
  TestValidator.equals(
    "first request still pending after failed second attempt",
    verifyRequest.request_status,
    "pending",
  );
  TestValidator.equals(
    "first request ID matches",
    verifyRequest.id,
    firstRequest.id,
  );
}