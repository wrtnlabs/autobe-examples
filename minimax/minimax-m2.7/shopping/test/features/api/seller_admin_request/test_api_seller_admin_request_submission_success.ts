import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_seller_admin_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account via authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Submit admin request with valid reason (default grade: 'admin')
  const adminRequest =
    await generate_random_ecommerce_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Validate response
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  TestValidator.equals(
    "actor_type is seller",
    adminRequest.actor_type,
    "seller",
  );
  TestValidator.equals(
    "requested_grade is admin",
    adminRequest.requested_grade,
    "admin",
  );
  TestValidator.predicate(
    "reason is present and non-empty",
    adminRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "reason length is within valid range",
    adminRequest.reason.length <= 1000,
  );
  TestValidator.equals(
    "reviewed_reason is null",
    adminRequest.reviewed_reason,
    null,
  );
  TestValidator.equals("reviewer is null", adminRequest.reviewer, null);
  TestValidator.predicate(
    "created_at is present",
    adminRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    adminRequest.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", adminRequest.deleted_at, null);
}
