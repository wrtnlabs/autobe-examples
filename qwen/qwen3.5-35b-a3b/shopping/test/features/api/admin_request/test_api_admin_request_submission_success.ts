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

export async function test_api_admin_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // Create a new connection with the customer's token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerAuthorized.token.access,
    },
  };
  const reason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  // 2. Submit admin request
  const adminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      authenticatedConnection,
      {
        body: {
          reason: reason satisfies string & tags.MinLength<1>,
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Validate response
  TestValidator.equals(
    "request status is pending",
    adminRequest.request_status,
    "pending",
  );
  TestValidator.equals("reason matches input", adminRequest.reason, reason);
  typia.assert(
    adminRequest.created_at satisfies string & tags.Format<"date-time">,
  );
  typia.assert(
    adminRequest.updated_at satisfies string & tags.Format<"date-time">,
  );
  typia.assert(adminRequest.admin satisfies IEcommerceMallAdmin.ISummary);
  TestValidator.equals(
    "snapshots is array",
    Array.isArray(adminRequest.snapshots),
    true,
  );
  typia.assertGuard(adminRequest.customerRequests);
  typia.assertGuard(adminRequest.sellerRequests);
  // Verify customer relationship
  TestValidator.equals(
    "customerRequests exists",
    adminRequest.customerRequests !== null,
    true,
  );
  typia.assertGuard(adminRequest.customerRequests?.customer);
  TestValidator.equals(
    "customer ID matches",
    adminRequest.customerRequests!.customer.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "customer email matches",
    adminRequest.customerRequests!.customer.email,
    customerAuthorized.email,
  );
  TestValidator.predicate(
    "customer has display name",
    adminRequest.customerRequests!.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer is_banned is boolean",
    typeof adminRequest.customerRequests!.customer.is_banned === "boolean",
  );
  typia.assert(
    adminRequest.customerRequests!.customer.created_at satisfies string &
      tags.Format<"date-time">,
  );
  // Verify seller relationship is null
  TestValidator.equals(
    "sellerRequests is null",
    adminRequest.sellerRequests === null,
    true,
  );
  // Verify deleted_at is nullable
  typia.assertGuard(adminRequest.deleted_at);
  TestValidator.equals(
    "deleted_at is null for new request",
    adminRequest.deleted_at === null,
    true,
  );
}