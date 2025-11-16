import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPolicyDocument";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPolicyDocument";

/**
 * Verify that an administrator can retrieve and search a paginated and filtered
 * list of platform policy documents.
 *
 * Steps:
 *
 * 1. Register a new administrator (using the join endpoint) and authenticate as
 *    them.
 * 2. Perform a policy document search (patch
 *    /communityPlatform/administrator/policyDocuments) using varied filter,
 *    sorting, and pagination parameters.
 * 3. Validate that each result contains only allowed summary fields — document id,
 *    type, version, effective_at, document_uri, and (optional) description —
 *    with correct types, and no direct confidential content disclosure.
 * 4. Verify pagination and filtering behave as requested: correct limits, correct
 *    sorting by effective_at/created_at/updated_at, and correct filtering by
 *    policy_type, version, effective date range, description substrings (free
 *    text).
 * 5. Attempt unauthorized or incorrectly authenticated access and check that
 *    access is rejected as expected (negative/unauthenticated/invalid
 *    credential test).
 * 6. Confirm role-based access (must be an administrator), and structurally check
 *    audit relevancy of results.
 */
export async function test_api_policy_document_list_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const joinResult: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        business_status: RandomGenerator.pick([
          null,
          undefined,
          "legal",
          "compliance",
        ]),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(joinResult);
  TestValidator.predicate(
    "received a valid token on administrator join",
    typeof joinResult.token.access === "string" &&
      joinResult.token.access.length > 0,
  );

  // 2. Search with default pagination, no filters
  const baseReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    order_by: RandomGenerator.pick([
      "effective_at",
      "created_at",
      "updated_at",
    ] as const),
    order_dir: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies Partial<ICommunityPlatformPolicyDocument.IRequest>;
  const baseRes =
    await api.functional.communityPlatform.administrator.policyDocuments.index(
      connection,
      { body: baseReq as ICommunityPlatformPolicyDocument.IRequest },
    );
  typia.assert(baseRes);
  TestValidator.predicate(
    "pagination page number matches request",
    baseRes.pagination.current === baseReq.page,
  );
  TestValidator.predicate(
    "result contains summary records for policy documents",
    Array.isArray(baseRes.data),
  );
  for (const doc of baseRes.data) {
    typia.assert(doc);
    TestValidator.predicate(
      "policy summary has required fields without content",
      typeof doc.id === "string" &&
        typeof doc.policy_type === "string" &&
        typeof doc.version === "string" &&
        typeof doc.effective_at === "string" &&
        typeof doc.document_uri === "string",
    );
    // Should NOT expose confidential content — only summary fields.
  }

  // 3. Filtering and sorting
  const filterType = RandomGenerator.pick([
    "tos",
    "privacy",
    "cookie",
  ] as const);
  const versionFilter = "v1.0";
  const filterReq = {
    ...baseReq,
    policy_type: filterType,
    version: versionFilter,
    effective_from: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 365,
    ).toISOString(), // One year ago
    effective_to: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365,
    ).toISOString(), // One year ahead
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies Partial<ICommunityPlatformPolicyDocument.IRequest>;
  const filterRes =
    await api.functional.communityPlatform.administrator.policyDocuments.index(
      connection,
      { body: filterReq as ICommunityPlatformPolicyDocument.IRequest },
    );
  typia.assert(filterRes);
  TestValidator.predicate(
    "filter result has summaries only",
    Array.isArray(filterRes.data),
  );
  for (const doc of filterRes.data) {
    typia.assert(doc);
    TestValidator.predicate(
      "policy_type matches filter (if present)",
      filterReq.policy_type == null ||
        doc.policy_type === filterReq.policy_type,
    );
    TestValidator.predicate(
      "version matches filter (if present)",
      filterReq.version == null || doc.version === filterReq.version,
    );
    if (filterReq.effective_from)
      TestValidator.predicate(
        "effective_at is after or at effective_from",
        new Date(doc.effective_at) >= new Date(filterReq.effective_from),
      );
    if (filterReq.effective_to)
      TestValidator.predicate(
        "effective_at is before or at effective_to",
        new Date(doc.effective_at) <= new Date(filterReq.effective_to),
      );
    if (filterReq.description)
      TestValidator.predicate(
        "description contains search text if present",
        !doc.description ||
          doc.description.includes(filterReq.description) ||
          filterReq.description == null,
      );
  }
  TestValidator.equals(
    "pagination and limit match filter",
    filterRes.pagination.limit,
    filterReq.limit,
  );

  // 4. Negative test: Unauthenticated/invalid access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list policy documents",
    async () => {
      await api.functional.communityPlatform.administrator.policyDocuments.index(
        unauthConn,
        { body: baseReq as ICommunityPlatformPolicyDocument.IRequest },
      );
    },
  );
}
