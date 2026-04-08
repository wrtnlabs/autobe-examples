import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
 * Test retrieving a seller profile with a non-existent UUID as an authenticated administrator.
 *
 * Validates the administrative oversight functionality for seller profile lookups. Ensures that when an administrator attempts to retrieve a seller profile using a UUID that does not exist in the database, the system properly returns a 404 error response. This test verifies the error handling logic for invalid profile ID lookups and confirms that the API correctly identifies non-existent resources.
 *
 * **Test Flow:**
 * 1. Administrator registers and authenticates successfully using admin join endpoint.
 * 2. System generates a random UUID that does not correspond to any existing seller profile.
 * 3. Administrator attempts to retrieve seller profile using the non-existent UUID.
 * 4. System returns 404 error indicating the seller profile was not found.
 *
 * **Error Handling Validation:** The test confirms that the API properly distinguishes between valid and invalid seller profile identifiers, returning appropriate HTTP error codes for non-existent resources.
 */
export async function test_api_seller_profile_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve seller profile with non-existent UUID
  await TestValidator.httpError(
    "should return 404 for non-existent seller profile",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.seller_profiles.at(
        adminConnection,
        {
          sellerProfileId: nonExistentId,
        },
      ),
  );
}
