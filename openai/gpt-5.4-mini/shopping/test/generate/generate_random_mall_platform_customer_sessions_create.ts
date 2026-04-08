import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_customer_session } from "../prepare/prepare_random_mall_platform_customer_session";

/**
 * Generate a random mall platform customer session via the API for E2E testing.
 *
 * Prepares randomized customer session login data with optional overrides,
 * then submits it to the authenticated session creation endpoint. The returned
 * session context can be used for downstream protected test scenarios.
 */
export async function generate_random_mall_platform_customer_sessions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformCustomerSession.ICreate> | undefined;
  },
): Promise<IMallPlatformCustomerSession> {
  const prepared: IMallPlatformCustomerSession.ICreate =
    prepare_random_mall_platform_customer_session(props.body);
  return await api.functional.mallPlatform.customer.sessions.create(
    connection,
    {
      body: prepared,
    },
  );
}
