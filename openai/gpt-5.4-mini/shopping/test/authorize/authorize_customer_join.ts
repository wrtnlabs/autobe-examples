import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new customer for E2E testing.
 *
 * Creates a customer account using the provided join payload and returns the
 * authorized customer response. The underlying SDK call also mutates the
 * connection with the issued access token so subsequent authenticated requests
 * can reuse the same connection.
 */
export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body: IMallPlatformCustomer.IJoin;
  },
): Promise<IMallPlatformCustomer.IAuthorized> {
  return await api.functional.mallPlatform.auth.customer.join(connection, {
    body: props.body,
  });
}
