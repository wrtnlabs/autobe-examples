import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_super_admin_email_verifications_create } from "../../../generate/generate_random_shopping_mall_super_admin_email_verifications_create";
import { prepare_random_shopping_mall_super_admin_email_verification } from "../../../prepare/prepare_random_shopping_mall_super_admin_email_verification";

export async function test_api_super_admin_email_verification_invalid_email_format(
  connection: api.IConnection,
): Promise<void> {
  // Create a copy of the connection for this test
  const adminConnection: api.IConnection = { host: connection.host };
  // Test with an invalid email format
  await TestValidator.error("should reject invalid email format", async () => {
    await api.functional.shoppingMall.superAdmin.email_verifications.create(
      adminConnection,
      {
        body: {
          // Empty body as per DTO definition - no email field required
        } satisfies IShoppingMallSuperAdminEmailVerification.ICreate,
      },
    );
  });
}
