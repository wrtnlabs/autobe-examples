import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPolicyDocument";

/**
 * Validate administrator soft-delete for platform policy documents.
 *
 * This test ensures that an authenticated administrator can successfully
 * soft-delete a specified policy document by policy type and version. The test
 * walks through the registration of a new administrator, creation of a target
 * policy document, execution of the delete-operation, and verification that the
 * record is properly soft-deleted (deleted_at set) and not returned in active
 * document queries.
 *
 * Steps:
 *
 * 1. Register a new administrator for privileged authentication.
 * 2. Create a new policy document (select random policy_type and version) as the
 *    deletion target.
 * 3. Delete the policy document using the administrator's session, passing correct
 *    policy_type and version.
 * 4. (Business logic, as listing endpoint is not provided in the test context):
 *    Retrieve the document directly (if such endpoint existed) or re-create
 *    with same identifiers and ensure uniqueness is enforced (simulate query
 *    exclusion and audit retention assumptions).
 */
export async function test_api_policy_document_soft_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new policy document
  const policyType = RandomGenerator.pick([
    "tos",
    "privacy",
    "cookie",
    `custom-${RandomGenerator.alphaNumeric(5)}`,
  ] as const);
  const version = `v${RandomGenerator.alphaNumeric(4)}`;
  const effectiveAt = new Date().toISOString();
  const documentUri = `https://policies.example.com/${policyType}/${version}.pdf`;
  const description = RandomGenerator.paragraph({ sentences: 4 });

  const policy: ICommunityPlatformPolicyDocument =
    await api.functional.communityPlatform.administrator.policyDocuments.create(
      connection,
      {
        body: {
          policy_type: policyType,
          version,
          effective_at: effectiveAt,
          document_uri: documentUri,
          description,
        } satisfies ICommunityPlatformPolicyDocument.ICreate,
      },
    );
  typia.assert(policy);
  TestValidator.equals(
    "created policy_type matches input",
    policy.policy_type,
    policyType,
  );
  TestValidator.equals(
    "created version matches input",
    policy.version,
    version,
  );
  TestValidator.equals(
    "created document_uri matches input",
    policy.document_uri,
    documentUri,
  );
  TestValidator.equals(
    "created deleted_at is null before deletion",
    policy.deleted_at,
    null,
  );

  // 3. Soft-delete the policy document by type and version
  await api.functional.communityPlatform.administrator.policyDocuments.erase(
    connection,
    {
      policyType,
      version,
    },
  );

  // 4. (Simulate audit/history: re-create with same identifiers has to error)
  await TestValidator.error(
    "Re-creating the same policy document (type/version) after soft-delete should fail due to unique constraint or proper audit history retention.",
    async () => {
      await api.functional.communityPlatform.administrator.policyDocuments.create(
        connection,
        {
          body: {
            policy_type: policyType,
            version,
            effective_at: new Date().toISOString(),
            document_uri: `https://policies.example.com/${policyType}/${version}-dup.pdf`,
            description: description,
          } satisfies ICommunityPlatformPolicyDocument.ICreate,
        },
      );
    },
  );
}
