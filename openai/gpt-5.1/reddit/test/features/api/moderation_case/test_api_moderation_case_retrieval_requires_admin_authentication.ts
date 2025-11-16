import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Verify that moderation case retrieval requires valid adminUser
 * authentication.
 *
 * Business goal: Ensure that the moderation case drill-down endpoint GET
 * /communityPlatform/adminUser/moderationCases/{caseKey} cannot be accessed
 * anonymously, while confirming that it works correctly with a valid adminUser
 * session.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join, which also establishes
 *    an authenticated admin session on the shared connection.
 * 2. Using the authenticated admin connection, create a concrete moderation case
 *    via POST /communityPlatform/adminUser/moderationCases and capture its
 *    business key (case_key).
 * 3. Create an unauthenticated connection by cloning the base connection but
 *    dropping any Authorization header, then attempt to GET the case by caseKey
 *    and assert that the call fails (i.e., some HTTP error is thrown, without
 *    asserting on specific status codes).
 * 4. Finally, using the original authenticated admin connection, call the GET
 *    endpoint again and assert that it succeeds, returning an
 *    ICommunityPlatformModerationCase matching the one that was created in step
 *    2 (at least verifying case_key and title).
 *
 * DTO usage notes:
 *
 * - Admin join uses ICommunityPlatformAdminUserJoin.IRequest as request body and
 *   returns ICommunityPlatformAdminuser.IAuthorized, which contains an
 *   IAuthorizationToken in the `token` property; the SDK automatically wires
 *   token.access into the Authorization header of the connection.
 * - Moderation case creation uses ICommunityPlatformModerationCase.ICreate as
 *   request body and returns a full ICommunityPlatformModerationCase.
 * - Retrieval uses the `caseKey` path parameter to target the case by its
 *   business key.
 */
export async function test_api_moderation_case_retrieval_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (admin join) to establish an authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case using the authenticated admin context
  const caseKey = RandomGenerator.alphaNumeric(16);
  const createBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCase);

  TestValidator.equals(
    "created case should use requested case_key",
    createdCase.case_key,
    caseKey,
  );

  // Build a base connection object for unauthenticated calls
  const baseConnection: api.IConnection = {
    ...connection,
  };

  // 3. Attempt retrieval with no Authorization header (unauthenticated)
  const unauthConnection: api.IConnection = {
    ...baseConnection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated moderation case retrieval should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.at(
        unauthConnection,
        {
          caseKey: createdCase.case_key,
        },
      );
    },
  );

  // 4. With valid adminUser session, retrieval should succeed
  const fetchedCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.at(
      connection,
      {
        caseKey: createdCase.case_key,
      },
    );
  typia.assert(fetchedCase);

  TestValidator.equals(
    "fetched case_key should match created case",
    fetchedCase.case_key,
    createdCase.case_key,
  );

  TestValidator.equals(
    "fetched title should match created case",
    fetchedCase.title,
    createdCase.title,
  );
}
