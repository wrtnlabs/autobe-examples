import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_customer_password_reset } from "../prepare/prepare_random_mall_platform_customer_password_reset";

/**
 * Generate a random customer password reset record via the API for E2E testing.
 *
 * Prepares random customer password reset initiation data using the prepare function, then calls the password reset creation endpoint to create and return the actual reset record.
 */
export async function generate_random_mall_platform_customer_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformCustomerPasswordReset.ICreate> | undefined;
  },
): Promise<IMallPlatformCustomerPasswordReset> {
  const prepared: IMallPlatformCustomerPasswordReset.ICreate =
    prepare_random_mall_platform_customer_password_reset(props.body);
  return await api.functional.mallPlatform.customer.password_resets.create(
    connection,
    {
      body: prepared,
    },
  );
}
