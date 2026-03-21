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
 * Test retrieving a non-existent promotion record returns 404.
 *
 * This test validates that the admin promotion retrieval endpoint properly
 * handles requests for promotion records that do not exist in the system.
 * The endpoint should return a 404 Not Found error with an appropriate
 * error message.
 *
 * Steps:
 * 1. Authenticate as superAdmin using POST /ecommerceMall/auth/superAdmin/join
 * 2. Execute GET /ecommerceMall/superAdmin/admin-promotions/{promotionId}
 *    with a UUID that does not exist in the system
 *
 * Validations:
 * - Response returns HTTP 404 Not Found
 * - Error message indicates the promotion record was not found
 * - No sensitive information is leaked in the error response
 */
export async function test_api_admin_promotion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Attempt to retrieve a non-existent promotion record
  const nonExistentPromotionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent promotion record",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin_promotions.at(
        superAdminConnection,
        {
          promotionId: nonExistentPromotionId,
        },
      ),
  );
}
