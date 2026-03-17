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
 * Test that newly registered administrator accounts have the correct initial state values.
 * After successful registration, verify that the admin record is created with admin_grade
 * set to 'regular' (not 'super'), account_status set to 'active', and that the created_at
 * and updated_at timestamps are properly recorded. This test validates the business rule
 * that all new administrators start with regular privileges and can only be promoted to
 * super administrator by existing super administrators.
 */
export async function test_api_admin_registration_with_correct_initial_state(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register new admin
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Validate initial state values
  TestValidator.equals("admin_grade is regular", admin.admin_grade, "regular");
  TestValidator.equals(
    "account_status is active",
    admin.account_status,
    "active",
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    admin.created_at !== undefined && admin.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    admin.updated_at !== undefined && admin.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    admin.deleted_at === null,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );
  TestValidator.predicate(
    "has valid email format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      admin.email,
    ),
  );
  TestValidator.predicate("has access token", admin.token.access.length > 0);
  TestValidator.predicate("has refresh token", admin.token.refresh.length > 0);
  TestValidator.predicate(
    "token has valid expired_at",
    admin.token.expired_at !== undefined && admin.token.expired_at !== null,
  );
  TestValidator.predicate(
    "token has valid refreshable_until",
    admin.token.refreshable_until !== undefined &&
      admin.token.refreshable_until !== null,
  );
}
