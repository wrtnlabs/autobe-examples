import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPolicyDocument";

/**
 * Test that administrator can retrieve a policy document by type/version and
 * verifies metadata/URI accuracy, uniqueness, and proper error handling for
 * non-existent or deleted records.
 *
 * Steps:
 *
 * 1. Register administrator and authenticate
 * 2. Create a policy document (unique policy_type/version)
 * 3. Retrieve by GET using type/version
 * 4. Validate returned document matches created document
 * 5. Try retrieving non-existent combination and check error
 */
export async function test_api_policy_document_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A1!";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create a new policy document
  const uniquePolicyType = RandomGenerator.name(2) + "-policy";
  const uniqueVersion = `v${RandomGenerator.alphaNumeric(5)}`;
  const uniqueUri = `https://docs.example.com/policies/${uniquePolicyType}/${uniqueVersion}.pdf`;
  const createInput = {
    policy_type: uniquePolicyType,
    version: uniqueVersion,
    effective_at: new Date().toISOString(),
    document_uri: uniqueUri as string & tags.Format<"uri">,
    description: RandomGenerator.paragraph(),
  } satisfies ICommunityPlatformPolicyDocument.ICreate;
  const created =
    await api.functional.communityPlatform.administrator.policyDocuments.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // 3. Retrieve by GET
  const fetched =
    await api.functional.communityPlatform.administrator.policyDocuments.at(
      connection,
      {
        policyType: uniquePolicyType,
        version: uniqueVersion,
      },
    );
  typia.assert(fetched);

  // 4. Validate content and metadata
  TestValidator.equals("document id matches", fetched.id, created.id);
  TestValidator.equals(
    "policy_type matches",
    fetched.policy_type,
    createInput.policy_type,
  );
  TestValidator.equals("version matches", fetched.version, createInput.version);
  TestValidator.equals(
    "effective_at matches",
    fetched.effective_at,
    createInput.effective_at,
  );
  TestValidator.equals(
    "document_uri matches",
    fetched.document_uri,
    createInput.document_uri,
  );
  TestValidator.equals(
    "description matches",
    fetched.description,
    createInput.description,
  );
  TestValidator.equals("not deleted", fetched.deleted_at, null);

  // 5. Attempt to fetch non-existent (random) version
  await TestValidator.error(
    "retrieving non-existent document fails",
    async () => {
      await api.functional.communityPlatform.administrator.policyDocuments.at(
        connection,
        {
          policyType: uniquePolicyType,
          version: `${uniqueVersion}_ZZ`,
        },
      );
    },
  );
  // 6. Attempt to fetch non-existent (random) policy_type
  await TestValidator.error(
    "retrieving with non-existent policy_type fails",
    async () => {
      await api.functional.communityPlatform.administrator.policyDocuments.at(
        connection,
        {
          policyType: `${uniquePolicyType}_ZZ`,
          version: uniqueVersion,
        },
      );
    },
  );
}
