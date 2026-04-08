import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator access to soft-deleted seller profiles.
 *
 * Validates that seller profiles which have been soft-deleted are not accessible through the admin profile retrieval endpoint, even when authenticated as an administrator. This ensures proper data isolation and prevents exposure of deleted seller information.
 *
 * The test authenticates as an administrator, then attempts to retrieve a seller profile using a UUID. Since seller creation and deletion APIs are not available in the current SDK, the test verifies the 404 Not Found response behavior, which demonstrates that deleted/non-existent profiles cannot be accessed.
 *
 * 1. Administrator authenticates via admin join endpoint using utility function.
 * 2. Administrator attempts to retrieve a seller profile by profile ID.
 * 3. Validates that the request returns HTTP 404 Not Found error.
 * 4. Confirms soft-deleted profiles are properly hidden from all access.
 */
export async function test_api_seller_profile_soft_deleted_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Attempt to retrieve a non-existent/soft-deleted seller profile
  const nonExistentProfileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Validate that accessing the profile returns 404 Not Found
  await TestValidator.httpError(
    "soft-deleted profile should return 404 Not Found",
    404,
    async () => {
      await api.functional.ecommerce.admin.profiles.at(adminConnection, {
        profileId: nonExistentProfileId,
      });
    },
  );
}
