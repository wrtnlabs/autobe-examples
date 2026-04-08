import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving a non-existent admin promotion record returns 404 Not Found error.
 *
 * This test validates that when a super administrator attempts to retrieve
 * a promotion record using an invalid/non-existent UUID, the API returns
 * a proper 404 Not Found error with appropriate error message.
 *
 * Steps:
 * 1. Register a super administrator account
 * 2. Generate a random UUID that does not correspond to any existing promotion record
 * 3. Call GET /ecommerceMall/superAdmin/superAdmin/admin-promotions/{promotionId} with non-existent UUID
 *
 * Validation points:
 * - Response status should be 404 Not Found
 * - Response should contain appropriate error message
 * - Response should not contain any promotion record data
 */
export async function test_api_admin_promotion_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a random UUID that does not exist
  const nonExistentPromotionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the API endpoint with non-existent UUID and expect 404 error
  await TestValidator.httpError(
    "non-existent promotion returns 404 Not Found",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.at(
        superAdminConnection,
        {
          promotionId: nonExistentPromotionId,
        },
      ),
  );
}
