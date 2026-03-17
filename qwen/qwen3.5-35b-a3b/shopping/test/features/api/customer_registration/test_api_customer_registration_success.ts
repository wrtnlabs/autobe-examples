import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_customer_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Register new customer using authorize_customer_join utility
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputPassword = RandomGenerator.alphaNumeric(16);
  const inputHref = typia.random<string & tags.Format<"uri">>();
  const inputReferrer = typia.random<string & tags.Format<"uri">>();
  const inputIp = typia.random<string & tags.Format<"ipv4">>();
  const response = await authorize_customer_join(customerConnection, {
    body: {
      email: inputEmail,
      password: inputPassword,
      href: inputHref,
      referrer: inputReferrer,
      ip: inputIp,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(response);
  // 3. Validate JWT credentials structure
  TestValidator.equals(
    "access token non-empty",
    response.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token non-empty",
    response.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "access token expired_at in future",
    new Date(response.token.expired_at) > new Date(),
    true,
  );
  TestValidator.equals(
    "refreshable_until in future",
    new Date(response.token.refreshable_until) > new Date(),
    true,
  );
  // 4. Validate customer metadata
  TestValidator.equals(
    "customer id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
    true,
  );
  TestValidator.equals("email matches input", response.email, inputEmail);
  TestValidator.equals(
    "display_name non-empty",
    response.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "phone_number is string or null",
    typeof response.phone_number === "string" || response.phone_number === null,
    true,
  );
  TestValidator.equals("status is active", response.status, "active");
  TestValidator.equals(
    "created_at valid datetime",
    !isNaN(new Date(response.created_at).getTime()),
    true,
  );
  TestValidator.equals(
    "updated_at valid datetime",
    !isNaN(new Date(response.updated_at).getTime()),
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    response.deleted_at,
    null,
  );
}
