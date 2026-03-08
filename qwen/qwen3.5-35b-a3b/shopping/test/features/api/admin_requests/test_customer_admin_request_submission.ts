import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_customer_admin_request_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // 2. Submit admin request with valid reason
  const validReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const adminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: validReason,
        },
      },
    );
  typia.assert(adminRequest);
  // 3. Validate response structure
  TestValidator.equals(
    "request status is pending",
    adminRequest.request_status,
    "pending",
  );
  TestValidator.equals(
    "reason matches input",
    adminRequest.reason,
    validReason,
  );
  TestValidator.equals(
    "admin id matches customer id",
    adminRequest.admin.id,
    customerAuthorized.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    adminRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    adminRequest.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", adminRequest.deleted_at, null);
  // 4. Test whitespace-only reason rejection
  await TestValidator.error("rejects whitespace-only reason", async () => {
    const whitespaceConnection: api.IConnection = { host: connection.host };
    const whitespaceCustomer = await authorize_customer_join(
      whitespaceConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallCustomer.IJoin,
      },
    );
    typia.assert(whitespaceCustomer);
    await api.functional.ecommerceMall.customer.admin_requests.create(
      whitespaceConnection,
      {
        body: {
          reason: "   ",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  });
  // 5. Test duplicate pending request rejection
  await TestValidator.error("rejects duplicate pending request", async () => {
    const secondConnection: api.IConnection = { host: connection.host };
    const secondCustomer = await authorize_customer_join(secondConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(secondCustomer);
    // Create first request
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      secondConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
        },
      },
    );
    // Try to create second pending request (should fail)
    await api.functional.ecommerceMall.customer.admin_requests.create(
      secondConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  });
}