import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPolicyDocument";

/**
 * Validates that an authenticated administrator can update the effective date,
 * document URI, and description of an existing policy document.
 *
 * Steps:
 *
 * 1. Authenticate as a new administrator using unique credentials.
 * 2. Create a new policy document and retrieve all identifying fields
 *    (policy_type, version) for update.
 * 3. Submit a valid update modifying effective_at, document_uri, and (optionally)
 *    description.
 * 4. Verify response data reflects the updates (updated fields are changed) and
 *    updated_at field is newer than before.
 */
export async function test_api_policy_document_update_as_administrator(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create a new policy document
  const initialPolicyBody = {
    policy_type: RandomGenerator.name(1),
    version: RandomGenerator.name(1),
    effective_at: new Date().toISOString(),
    document_uri: "https://example.com/" + RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPolicyDocument.ICreate;
  const initialPolicy =
    await api.functional.communityPlatform.administrator.policyDocuments.create(
      connection,
      {
        body: initialPolicyBody,
      },
    );
  typia.assert(initialPolicy);

  // 3. Update the policy document
  // Use different values for effective_at and document_uri
  const newEffectiveAt = new Date(Date.now() + 86400000).toISOString();
  const newDocumentUri =
    "https://cdn.policies.test/" + RandomGenerator.alphaNumeric(8);
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updateBody = {
    effective_at: newEffectiveAt,
    document_uri: newDocumentUri,
    description: newDescription,
  } satisfies ICommunityPlatformPolicyDocument.IUpdate;

  const updated =
    await api.functional.communityPlatform.administrator.policyDocuments.update(
      connection,
      {
        policyType: initialPolicy.policy_type,
        version: initialPolicy.version,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Verify updated fields and audit changes
  TestValidator.equals(
    "updated effective_at",
    updated.effective_at,
    newEffectiveAt,
  );
  TestValidator.equals(
    "updated document_uri",
    updated.document_uri,
    newDocumentUri,
  );
  TestValidator.equals(
    "updated description",
    updated.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    initialPolicy.updated_at,
  );
}
