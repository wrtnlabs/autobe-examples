import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test cross-administrator profile retrieval scenario.
 *
 * This test validates that one administrator can retrieve another
 * administrator's profile information for oversight purposes.
 * The test creates two separate administrator accounts and verifies
 * that the first admin can successfully view the second admin's profile.
 */
export async function test_api_admin_retrieve_other_admin_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first administrator (requesting admin)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: admin1Email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // 2. Create second administrator (target admin)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: admin2Email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // 3. First admin retrieves second admin's profile
  const retrievedProfile = await api.functional.shoppingMall.admin.admins.at(
    admin1Connection,
    {
      adminId: admin2Auth.id,
    },
  );
  typia.assert(retrievedProfile);
  // 4. Validate retrieved profile matches second admin
  TestValidator.equals("email matches", retrievedProfile.email, admin2Email);
  TestValidator.equals("grade is regular", retrievedProfile.grade, "regular");
  TestValidator.equals("status is active", retrievedProfile.status, "active");
  TestValidator.equals("id matches", retrievedProfile.id, admin2Auth.id);
  TestValidator.predicate(
    "created_at exists",
    retrievedProfile.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedProfile.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", retrievedProfile.deleted_at, null);
}
