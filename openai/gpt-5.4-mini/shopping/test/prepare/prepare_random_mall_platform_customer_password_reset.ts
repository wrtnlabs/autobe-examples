import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random customer password reset initiation data for E2E testing.
 *
 * Generates a complete IMallPlatformCustomerPasswordReset.ICreate payload with a
 * customer UUID, allowing test-time overrides through DeepPartial input while
 * auto-generating a valid UUID when omitted.
 */
export function prepare_random_mall_platform_customer_password_reset(
  input?: DeepPartial<IMallPlatformCustomerPasswordReset.ICreate> | undefined,
): IMallPlatformCustomerPasswordReset.ICreate {
  return {
    mall_platform_customer_id:
      input?.mall_platform_customer_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
