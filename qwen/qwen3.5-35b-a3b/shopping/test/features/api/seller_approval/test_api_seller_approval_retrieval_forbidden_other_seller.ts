import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_seller_approval_retrieval_forbidden_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A account
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerA);
  // 2. Seller A creates approval request
  const sellerAApprovalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerAConnection,
      {
        body: {
          request_reason: `Business reason for ${sellerA.email}`,
        },
      },
    );
  typia.assert(sellerAApprovalRequest);
  // 3. Create Seller B account
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerB);
  // 4. Seller B creates approval request
  const sellerBApprovalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerBConnection,
      {
        body: {
          request_reason: `Business reason for ${sellerB.email}`,
        },
      },
    );
  typia.assert(sellerBApprovalRequest);
  // 5. Seller A attempts to retrieve Seller B's approval request (should fail with 403)
  await TestValidator.httpError(
    "seller cannot access other seller's approval request",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.seller_approvals.at(
        sellerAConnection,
        {
          requestId: sellerBApprovalRequest.id,
        },
      );
    },
  );
}