import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random customer session creation data for E2E testing.
 *
 * Generates a complete IMallPlatformCustomerSession.ICreate with realistic
 * authentication and client-context values. Each field can be selectively
 * overridden through DeepPartial input for test customization.
 */
export function prepare_random_mall_platform_customer_session(
  input?: DeepPartial<IMallPlatformCustomerSession.ICreate> | undefined,
): IMallPlatformCustomerSession.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      input?.password ?? typia.random<string & tags.Format<"password">>(),
    href: input?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer: input?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  };
}
