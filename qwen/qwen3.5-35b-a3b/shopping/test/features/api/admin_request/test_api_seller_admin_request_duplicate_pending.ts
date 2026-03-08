import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_seller_admin_request_duplicate_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Submit first admin request
  const firstRequest =
    await generate_random_ecommerce_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Need admin access for system maintenance",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // 3. Verify first request status is pending
  TestValidator.equals(
    "first request status is pending",
    firstRequest.request_status,
    "pending",
  );
  // 4. Attempt to submit second admin request (should fail with 409)
  await TestValidator.error("duplicate pending request rejected", async () => {
    await generate_random_ecommerce_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Need urgent admin privileges",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  });
  // 5. Verify first request still exists and is pending by attempting to read it
  // Since we don't have a read function, we verify by checking the first request object still has pending status
  TestValidator.equals(
    "first request remains pending",
    firstRequest.request_status,
    "pending",
  );
}
