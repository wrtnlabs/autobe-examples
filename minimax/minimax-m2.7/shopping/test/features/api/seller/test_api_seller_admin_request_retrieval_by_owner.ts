import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

export async function test_api_seller_admin_request_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Submit an admin privilege request with a reason
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const adminRequest =
    await api.functional.ecommerceMall.seller.seller.admin_requests.create(
      sellerConnection,
      {
        body: {
          reason: reason,
        } satisfies IEcommerceMallSellerAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Retrieve the admin request by its ID
  const retrievedRequest =
    await api.functional.ecommerceMall.seller.seller.admin_requests.at(
      sellerConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate the retrieved request
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals("reason matches input", retrievedRequest.reason, reason);
  TestValidator.equals(
    "rejection_reason is null",
    retrievedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is valid",
    retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedRequest.updated_at !== undefined,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller approval_status matches",
    retrievedRequest.seller.approval_status,
    seller.approval_status,
  );
  TestValidator.predicate(
    "seller has profile",
    retrievedRequest.seller.profile !== undefined,
  );
}
