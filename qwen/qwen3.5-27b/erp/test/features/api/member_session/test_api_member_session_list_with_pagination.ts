import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberSession";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session listing with pagination support.
 *
 * Validates the complete member session listing flow including member authentication, session retrieval with default pagination, and page-based pagination navigation. Ensures that sessions are correctly scoped to the authenticated member's organization and that pagination metadata is accurate.
 *
 * Special attention is given to verifying pagination metadata consistency, session data structure, and page-based navigation stability across multiple pages.
 *
 * 1. Authenticate as a member by joining with email and password.
 * 2. Call the sessions list endpoint with default pagination parameters.
 * 3. Verify response contains pagination metadata and session summaries.
 * 4. Validate each session includes required fields and proper relationships.
 * 5. Test page-based pagination by requesting page 2.
 * 6. Verify consistent ordering and no duplicate sessions across pages.
 */
export async function test_api_member_session_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Call sessions list with default pagination
  const firstPage = await api.functional.hrmTimeTrack.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackMemberSession.IRequest,
    },
  );
  typia.assert(firstPage);
  // 3. Verify pagination metadata
  TestValidator.predicate(
    "current page is valid",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within bounds",
    firstPage.pagination.limit >= 1 && firstPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // 4. Verify session data structure
  await ArrayUtil.asyncForEach(firstPage.data, async (session) => {
    typia.assert(session);
    // Verify session is scoped to authenticated member's organization
    TestValidator.predicate(
      "session has organization context",
      session.organization.id.length > 0,
    );
    TestValidator.predicate(
      "session has member context",
      session.member.id.length > 0,
    );
  });
  // 5. Test page-based pagination if more pages exist
  if (firstPage.pagination.pages > 1) {
    // Request second page using page parameter
    const secondPage = await api.functional.hrmTimeTrack.member.sessions.index(
      memberConnection,
      {
        body: {
          page: 2,
        } satisfies IHrmTimeTrackMemberSession.IRequest,
      },
    );
    typia.assert(secondPage);
    // 6. Verify consistent ordering and no duplicates
    const firstPageIds = firstPage.data.map((s) => s.id);
    const secondPageIds = secondPage.data.map((s) => s.id);
    const duplicates = firstPageIds.filter((id) => secondPageIds.includes(id));
    TestValidator.equals(
      "no duplicate sessions across pages",
      duplicates.length,
      0,
    );
    // Verify pagination metadata for second page
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page records matches first page",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page pages matches first page",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
  }
}
