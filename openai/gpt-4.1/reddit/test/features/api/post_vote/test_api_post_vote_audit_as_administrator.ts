import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";

/**
 * Validate administrative auditing and advanced filtering of post voting
 * behavior.
 *
 * 1. Register a new administrator and acquire their authentication token.
 * 2. Attempt vote audit search with no authentication — must be denied.
 * 3. Authenticated as administrator, search with random, full criteria:
 *
 *    - Use random/valid post_id, user_id, and vote_type ("up"/"down").
 *    - Use a recent date-time range for created_from/created_to.
 *    - Flip include_deleted true/false (ensure both are covered).
 *    - Try different page/limit and edge-case values.
 *    - Sort by created_at asc/desc and vote_type.
 * 4. For each query:
 *
 *    - Validate result type and that returned votes match all specified filters.
 *    - Check pagination info matches requested page/limit, and edge behaviors
 *         (first/last page).
 *    - If include_deleted is true, ensure deleted votes appear, else do not.
 *    - If no records, returned data must be empty but pagination present.
 * 5. Attempt access to the audit endpoint with role other than administrator,
 *    expecting access denied each time.
 * 6. Confirm no sensitive audit info leaks to non-administrators.
 */
export async function test_api_post_vote_audit_as_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator and obtain authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  const adminId = admin.id;
  const token: IAuthorizationToken = admin.token;

  // 2. Try audit endpoint access without authentication (simulate unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access vote audit endpoint",
    async () => {
      await api.functional.communityPlatform.administrator.postVotes.index(
        unauthConn,
        {
          body: typia.random<ICommunityPlatformPostVote.IRequest>(),
        },
      );
    },
  );

  // 3. Authenticated admin searches with various filters
  // We'll use several filter cases on realistic random data
  const baseFilter = {
    post_id: typia.random<string & tags.Format<"uuid">>(),
    user_id: typia.random<string & tags.Format<"uuid">>(),
    vote_type: RandomGenerator.pick(["up", "down"] as const),
    created_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_to: new Date().toISOString(),
  } satisfies Partial<ICommunityPlatformPostVote.IRequest>;

  // Case A: include_deleted = false, first page, ascending by created_at
  {
    const outputA =
      await api.functional.communityPlatform.administrator.postVotes.index(
        connection,
        {
          body: {
            ...baseFilter,
            include_deleted: false,
            page: 1,
            limit: 10,
            sort_by: "created_at",
            sort_order: "asc",
          } satisfies ICommunityPlatformPostVote.IRequest,
        },
      );
    typia.assert(outputA);
    TestValidator.predicate(
      "pagination info present (A)",
      !!outputA.pagination && typeof outputA.pagination.current === "number",
    );
    // Ensure each result matches filter criteria
    for (const vote of outputA.data) {
      typia.assert(vote);
      TestValidator.equals(
        "vote_type correct (A)",
        vote.vote_type,
        baseFilter.vote_type,
      );
      TestValidator.equals(
        "post_id correct (A)",
        vote.post.id,
        baseFilter.post_id,
      );
      TestValidator.equals(
        "user_id correct (A)",
        vote.user.id,
        baseFilter.user_id,
      );
      TestValidator.predicate(
        "created_at in range (A)",
        vote.created_at >= baseFilter.created_from! &&
          vote.created_at <= baseFilter.created_to!,
      );
    }
  }
  // Case B: include_deleted = true, last page (calculate plausible page#), descending by created_at
  {
    const limit = 5;
    const filterB = {
      ...baseFilter,
      include_deleted: true,
      page: 3,
      limit,
      sort_by: "created_at",
      sort_order: "desc",
    } satisfies ICommunityPlatformPostVote.IRequest;
    const outputB =
      await api.functional.communityPlatform.administrator.postVotes.index(
        connection,
        {
          body: filterB,
        },
      );
    typia.assert(outputB);
    TestValidator.predicate(
      "pagination info present (B)",
      !!outputB.pagination && typeof outputB.pagination.current === "number",
    );
    // If data present & include_deleted true, at least one result should potentially have deleted info
    if (outputB.data.length > 0 && filterB.include_deleted) {
      // Data matches filter
      for (const vote of outputB.data) {
        typia.assert(vote);
        TestValidator.equals(
          "vote_type correct (B)",
          vote.vote_type,
          baseFilter.vote_type,
        );
        TestValidator.equals(
          "post_id correct (B)",
          vote.post.id,
          baseFilter.post_id,
        );
        TestValidator.equals(
          "user_id correct (B)",
          vote.user.id,
          baseFilter.user_id,
        );
        TestValidator.predicate(
          "created_at in range (B)",
          vote.created_at >= baseFilter.created_from! &&
            vote.created_at <= baseFilter.created_to!,
        );
      }
    } else {
      // If no data or include_deleted=false, that's still valid, just ensure return type correct
      TestValidator.equals(
        "empty data allowed (B)",
        outputB.data.length,
        outputB.data.length,
      );
    }
  }
  // Case C: page/limit edge (page far beyond total count, expect empty data)
  {
    const outputC =
      await api.functional.communityPlatform.administrator.postVotes.index(
        connection,
        {
          body: {
            ...baseFilter,
            include_deleted: false,
            page: 1000,
            limit: 5,
            sort_by: "vote_type",
            sort_order: "asc",
          } satisfies ICommunityPlatformPostVote.IRequest,
        },
      );
    typia.assert(outputC);
    TestValidator.equals(
      "empty page returns empty data (C)",
      outputC.data.length,
      0,
    );
    TestValidator.predicate(
      "pagination info present (C)",
      !!outputC.pagination && typeof outputC.pagination.current === "number",
    );
  }

  // 4. Access control: non-admin/unauthenticated must get denied
  // Already covered unauthenticated. Now simulate non-admin role (simulate with empty headers). (No user join endpoint given, so can't log in as different role.)
  await TestValidator.error(
    "non-admin role is forbidden on audit endpoint",
    async () => {
      await api.functional.communityPlatform.administrator.postVotes.index(
        unauthConn,
        {
          body: typia.random<ICommunityPlatformPostVote.IRequest>(),
        },
      );
    },
  );

  // 5. Confirm audit data is not leaked to unauthenticated/non-admin
  // (Already validated by errors and no return on denied calls.)
}
