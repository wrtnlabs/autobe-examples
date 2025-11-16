import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorSession";

/**
 * Basic flow for platform admin to index moderator sessions.
 *
 * Business goal
 *
 * - Ensure that a freshly joined platform administrator can successfully call the
 *   moderator session index endpoint with paging parameters and receive a
 *   structurally valid paginated response that is scoped to the requested
 *   moderator ID.
 *
 * Scenario outline
 *
 * 1. Register and authenticate a new platform administrator using
 *    api.functional.auth.platformAdmin.join.
 *
 *    - Use a realistic ICommunityPlatformPlatformadmin.IJoin payload with random
 *         username/email, password, and a valid href/referrer.
 *    - Rely on the SDK to propagate the returned access token into
 *         connection.headers.Authorization.
 * 2. Prepare a communityModeratorId to query.
 *
 *    - As there is no moderator creation or discovery API in the provided scope,
 *         generate a random UUID string as moderator id.
 *    - The backend may return an empty page when no sessions exist; the test must
 *         handle both empty and non-empty result sets.
 * 3. Call
 *    api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index
 *    with:
 *
 *    - CommunityModeratorId: the generated ID.
 *    - Body: ICommunityPlatformCommunityModeratorSession.IRequest with page=1,
 *         limit=20, and from/to omitted (letting backend defaults apply).
 * 4. Validate the shape of the response:
 *
 *    - Use typia.assert(page) to ensure the runtime structure matches the DTO.
 *    - Assert with TestValidator that pagination.current is >= 0, limit >= 0,
 *         records >= 0, and pages >= 0.
 *    - Assert that when records === 0, data.length is 0.
 *    - Assert that when records > 0, data.length > 0.
 * 5. When the response contains at least one session, perform stronger business
 *    checks on the first item and on the collection:
 *
 *    - Verify that id is a non-empty string, ip/href/referrer are non-empty strings,
 *         and created_at is present (typia.assert already checks formatting, so
 *         just assert non-empty semantics where meaningful).
 *    - Verify that communityModerator is populated and that its id is a non-empty
 *         string.
 *    - Verify that every session in data has a communityModerator.id equal to the
 *         requested communityModeratorId (scoping guarantee).
 *    - Expired_at may be null/undefined or a valid date-time; do not enforce
 *         stronger rules beyond typia.assert, but demonstrate access.
 *
 * Implementation notes
 *
 * - Do not assume the backend guarantees records >= 1; tests must be robust
 *   against an empty dataset.
 * - All API calls must be awaited.
 * - Use only types and SDK functions from the provided imports.
 */
export async function test_api_platform_admin_index_moderator_sessions_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a communityModeratorId (random UUID string)
  const communityModeratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call sessions.index with basic paging criteria
  const request = {
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformCommunityModeratorSession.IRequest;

  const page: IPageICommunityPlatformCommunityModeratorSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
      connection,
      {
        communityModeratorId,
        body: request,
      },
    );

  // 4. Validate structural correctness
  typia.assert(page);

  const pagination = page.pagination;

  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  // Relationship between records and data length
  if (pagination.records === 0) {
    TestValidator.equals(
      "data is empty when records is zero",
      page.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "data is non-empty when records is positive",
      page.data.length > 0,
    );
  }

  // 5. Stronger checks when there is at least one session
  if (page.data.length > 0) {
    const first: ICommunityPlatformCommunityModeratorSession.ISummary =
      page.data[0];

    TestValidator.predicate(
      "first session id is non-empty",
      first.id.length > 0,
    );
    TestValidator.predicate(
      "first session ip is non-empty",
      first.ip.length > 0,
    );
    TestValidator.predicate(
      "first session href is non-empty",
      first.href.length > 0,
    );
    TestValidator.predicate(
      "first session referrer is non-empty",
      first.referrer.length > 0,
    );

    // created_at format validated by typia, but ensure it exists as string
    TestValidator.predicate(
      "first session created_at is present",
      first.created_at.length > 0,
    );

    // communityModerator presence and basic integrity
    const moderator: ICommunityPlatformCommunityModerator.ISummary =
      first.communityModerator;
    TestValidator.predicate(
      "communityModerator.id is non-empty",
      moderator.id.length > 0,
    );

    // expired_at may be null/undefined or string; typia validation already
    // guarantees type, so here we only access it to ensure no runtime errors
    if (first.expired_at != null) {
      TestValidator.predicate(
        "expired_at, when present, is non-empty",
        first.expired_at.length > 0,
      );
    }

    // Scope check: all sessions should belong to the same moderator id
    for (const session of page.data) {
      TestValidator.equals(
        "session communityModerator.id matches requested moderatorId",
        session.communityModerator.id,
        communityModeratorId,
      );
    }
  }
}
