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

export async function test_api_seller_admin_request_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAccount);
  // 2. Seller submits admin request with proper authorization
  const submitConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAccount.token.access },
  };
  const submitReason = RandomGenerator.paragraph({ sentences: 3 });
  const adminRequest =
    await api.functional.ecommerceMall.seller.admin_requests.create(
      submitConnection,
      {
        body: {
          reason: submitReason,
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Validate request_status is 'pending'
  TestValidator.equals(
    "request_status is pending",
    adminRequest.request_status,
    "pending",
  );
  // 4. Validate deleted_at is null (active request)
  TestValidator.equals("deleted_at is null", adminRequest.deleted_at, null);
  // 5. Validate admin summary fields
  TestValidator.equals(
    "admin summary id matches seller id",
    adminRequest.admin.id,
    sellerAccount.id,
  );
  TestValidator.equals(
    "admin summary email matches seller email",
    adminRequest.admin.email,
    sellerAccount.email,
  );
  TestValidator.equals(
    "admin summary is_banned matches",
    adminRequest.admin.is_banned,
    sellerAccount.is_banned,
  );
  // 6. Verify reason field preserved exact text
  TestValidator.equals(
    "reason field preserved",
    adminRequest.reason,
    submitReason,
  );
  // 7. Verify timestamps are valid and in the past (not in future)
  const now = new Date();
  const created = new Date(adminRequest.created_at);
  const updated = new Date(adminRequest.updated_at);
  TestValidator.predicate("created_at is not in the future", created <= now);
  TestValidator.predicate("updated_at is not in the future", updated <= now);
  TestValidator.predicate(
    "created_at equals updated_at for new request",
    adminRequest.created_at === adminRequest.updated_at,
  );
}
