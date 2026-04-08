import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_request_submission_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account with known password
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Login as customer to get authenticated connection
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Submit admin request as customer
  const adminRequestBody = {
    actorType: "customer" as const,
    requestedGrade: "admin" as const,
    reason: RandomGenerator.paragraph({ sentences: 5 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminResponse =
    await api.functional.ecommerceMall.auth.admin.request.join(
      customerLoginConnection,
      { body: adminRequestBody },
    );
  typia.assert(adminResponse);
  // 4. Validate response structure - admin fields
  TestValidator.predicate("has valid admin id", adminResponse.id.length > 0);
  TestValidator.predicate("has valid email", adminResponse.email.includes("@"));
  TestValidator.predicate("has valid name", adminResponse.name.length > 0);
  // 5. Validate token structure
  TestValidator.predicate(
    "has access token",
    adminResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    adminResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    adminResponse.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    adminResponse.token.refreshable_until.includes("T"),
  );
  // 6. Validate timestamps
  TestValidator.predicate(
    "has created_at timestamp",
    adminResponse.created_at.includes("T"),
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    adminResponse.updated_at.includes("T"),
  );
}
