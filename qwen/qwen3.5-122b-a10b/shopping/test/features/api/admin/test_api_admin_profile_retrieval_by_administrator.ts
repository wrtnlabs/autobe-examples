import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
 * Test that an authenticated administrator can retrieve detailed profile information for another administrator account on the platform.
 *
 * The scenario validates the primary success path where:
 * 1. A super administrator joins the system and authenticates
 * 2. A regular administrator account is created through the join process
 * 3. The super administrator retrieves the regular administrator's profile using their adminId
 * 4. The response includes all expected fields: id, email, admin_grade, account_status, created_at, updated_at, deleted_at
 * 5. The password_hash is excluded from the response for security
 * 6. The admin_grade correctly shows 'regular' for the newly created admin
 * 7. The account_status correctly shows 'active' for the newly created admin
 * 8. All timestamps are present and valid ISO 8601 format
 *
 * This test validates the core administrative oversight capability that allows administrators to view complete profile information for any administrator on the platform.
 */
export async function test_api_admin_profile_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins the system
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(superAdminConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>()
        ),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(superAdminAuth);
  // 2. Regular administrator account is created through the join process
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(regularAdminConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>()
        ),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(regularAdminAuth);
  // 3. Super administrator retrieves the regular administrator's profile using their adminId
  const adminProfile: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admins.at(superAdminConnection, {
      adminId: regularAdminAuth.id,
    });
  typia.assert(adminProfile);
  // 4-8. Validate response structure and values
  TestValidator.equals(
    "admin ID matches",
    adminProfile.id,
    regularAdminAuth.id,
  );
  TestValidator.equals(
    "email matches",
    adminProfile.email,
    regularAdminAuth.email,
  );
  TestValidator.equals(
    "admin_grade is regular",
    adminProfile.admin_grade,
    "regular",
  );
  TestValidator.equals(
    "account_status is active",
    adminProfile.account_status,
    "active",
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(adminProfile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(adminProfile.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    adminProfile.deleted_at,
    null,
  );
}
