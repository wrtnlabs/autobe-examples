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
 * Test successful administrator registration with valid credentials.
 *
 * Validates the complete admin registration flow through POST /ecommerceMall/auth/admin/join endpoint. Verifies that when provided with valid email, password (minimum 8 characters), and display name, the system creates a new administrator account and returns proper authorization tokens.
 *
 * The test generates random valid credentials using typia.random and RandomGenerator to ensure unique test data. Session context fields (href, referrer) are included to simulate real browser registration flows.
 *
 * **Validation Focus**:
 * - Response contains IEcommerceMallAdmin.IAuthorized structure
 * - Admin record has valid UUID id and matches submitted email/name
 * - JWT access token is properly formatted with three dot-separated parts
 * - Refresh token is provided for session continuation
 * - Timestamps (created_at, updated_at) are valid ISO datetime
 * - deleted_at is null indicating active account
 *
 * 1. Generate random admin credentials with valid email format.
 * 2. Submit POST request to /ecommerceMall/auth/admin/join.
 * 3. Validate response contains all required IAuthorized fields.
 * 4. Verify JWT access token format and token structure.
 * 5. Confirm account timestamps are properly set.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random valid admin credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10) + "!Ab1"; // min 8 chars
  const name = RandomGenerator.name();
  // 2. Call admin join endpoint with valid credentials
  const response = await api.functional.ecommerceMall.auth.admin.join(
    connection,
    {
      body: {
        email,
        password,
        name,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  // 3. Validate response structure with typia.assert
  typia.assert(response);
  // 4. Validate admin record fields
  TestValidator.equals("email matches submitted", response.email, email);
  TestValidator.equals("name matches submitted", response.name, name);
  TestValidator.equals("deleted_at is null", response.deleted_at, null);
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token is JWT format (3 parts)",
    response.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "refresh token exists",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      response.token.refreshable_until,
    ),
  );
  // 6. Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.updated_at),
  );
}
