import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Validates that an authenticated administrator can retrieve their own detail.
 *
 * 1. Register a new admin using a unique random email and a sample password,
 *    optionally providing business_status.
 * 2. After registration, obtain the admin id from the output.
 * 3. Immediately attempt to GET administrator detail by id (authenticated, as the
 *    SDK will set Authorization automatically).
 * 4. Assert that all admin detail fields in the response (id, email, status,
 *    business_status, created_at, updated_at, deleted_at) are present and match
 *    those from the join response.
 * 5. Confirm that no password hash or credential fields are present in the admin
 *    detail response (security check).
 */
export async function test_api_administrator_detail_retrieval_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const businessStatus = RandomGenerator.paragraph({ sentences: 2 });

  const joined = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: businessStatus,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(joined);

  // 2. Retrieve detail using the returned id (the SDK will send the auth token)
  const detail =
    await api.functional.communityPlatform.administrator.administrators.at(
      connection,
      {
        administratorId: joined.id,
      },
    );
  typia.assert(detail);

  // 3. Validate all fields match -- except for token field, which is only on the join output
  TestValidator.equals("id should match", detail.id, joined.id);
  TestValidator.equals("email should match", detail.email, joined.email);
  TestValidator.equals("status should match", detail.status, joined.status);
  TestValidator.equals(
    "business_status should match",
    detail.business_status,
    joined.business_status,
  );
  TestValidator.equals(
    "created_at should match",
    detail.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "updated_at should match",
    detail.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "deleted_at should match",
    detail.deleted_at,
    joined.deleted_at,
  );

  // 4. Security: Credential/hash fields must NOT exist
  TestValidator.predicate(
    "no secret or credential fields in detail response",
    Object.keys(detail).every(
      (key) => key !== "password" && key !== "password_hash" && key !== "token",
    ),
  );
}
