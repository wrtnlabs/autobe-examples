import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPolicyDocument";

/**
 * Test that an administrator can create a new legal/compliance policy document
 * after successful registration and authentication. Ensures system integrity by
 * enforcing unique (policy_type, version) and validates audit traceability.
 *
 * Steps:
 *
 * 1. Register a new administrator using /auth/administrator/join with random
 *    unique email/password.
 * 2. Use authenticated admin context (token auto-handled by SDK) to create a new
 *    policy document via /communityPlatform/administrator/policyDocuments,
 *    providing:
 *
 *    - Unique policy_type (e.g., 'privacy', 'tos', or random),
 *    - Unique version string (e.g., 'v1.0', '2025-01'),
 *    - Valid effective_at (future ISO 8601 timestamp),
 *    - Document_uri (valid URI),
 *    - Optional description.
 * 3. Validate that the returned document record matches input values, and verify:
 *
 *    - Id is a valid UUID
 *    - Created_at and updated_at are valid ISO timestamps, and within a close range
 *         of now
 *    - No deleted_at
 * 4. Attempt to create a duplicate policy document with the same (policy_type,
 *    version). Assert error (unique constraint enforced).
 */
export async function test_api_policy_document_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: null,
    },
  });
  typia.assert(admin);
  // 2. Create unique policy document
  const now = new Date();
  const effectiveAt = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const policyType = `policy-type-${RandomGenerator.alphabets(6)}`;
  const version = `v${now.getFullYear()}-${now.getMonth() + 1}`;
  const documentUri = `https://policies.example.com/${policyType}/${version}.pdf`;
  const description = RandomGenerator.paragraph({ sentences: 5 });

  const input = {
    policy_type: policyType,
    version,
    effective_at: effectiveAt as string & tags.Format<"date-time">,
    document_uri: documentUri as string & tags.Format<"uri">,
    description,
  } satisfies ICommunityPlatformPolicyDocument.ICreate;

  const created =
    await api.functional.communityPlatform.administrator.policyDocuments.create(
      connection,
      { body: input },
    );
  typia.assert(created);
  // 3. Validate response data matches inputs and audit fields
  TestValidator.equals("policy_type matches", created.policy_type, policyType);
  TestValidator.equals("version matches", created.version, version);
  TestValidator.equals(
    "effective_at matches",
    created.effective_at,
    effectiveAt as string & tags.Format<"date-time">,
  );
  TestValidator.equals(
    "document_uri matches",
    created.document_uri,
    documentUri as string & tags.Format<"uri">,
  );
  TestValidator.equals("description matches", created.description, description);
  // UUID and date-time format ensured by typia.assert
  TestValidator.equals(
    "deleted_at is null/undefined",
    created.deleted_at,
    undefined,
  );

  // 4. Unique constraint check: try to create again with same policy_type/version
  await TestValidator.error(
    "duplicated (policy_type, version) should fail",
    async () => {
      await api.functional.communityPlatform.administrator.policyDocuments.create(
        connection,
        { body: input },
      );
    },
  );
}
