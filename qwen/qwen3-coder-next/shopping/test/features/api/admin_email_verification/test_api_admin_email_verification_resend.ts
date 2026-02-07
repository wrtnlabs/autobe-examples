import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_admin_email_verifications_resend_verification } from "../../../generate/generate_random_shopping_mall_admin_email_verifications_resend_verification";
import { prepare_random_shopping_mall_admin_email_verification } from "../../../prepare/prepare_random_shopping_mall_admin_email_verification";

export async function test_api_admin_email_verification_resend(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Since authorizationActor is null, no authentication is required
  // Test the endpoint directly without authentication
  const result =
    await api.functional.shoppingMall.admin.email_verifications.resendVerification(
      adminConnection,
      {
        body: typia.random<IShoppingMallAdminEmailVerification.ICreate>(),
      },
    );
  typia.assert(result);
}
