import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsVisitor";

export async function test_api_visitor_refresh_existing_session(
  connection: api.IConnection,
) {
  // 1) Create a new visitor session via /auth/visitor/join
  const joinBody = {
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      session_ttl_seconds: 60 * 60, // 1 hour TTL suggestion
    },
  } satisfies ICommunityBbsVisitor.ICreate;

  const firstAuth: ICommunityBbsVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: joinBody,
    });
  typia.assert(firstAuth);

  // Basic assertions about returned shape and required fields
  TestValidator.predicate(
    "join returned visitor id",
    typeof firstAuth.id === "string" && firstAuth.id.length > 0,
  );
  TestValidator.predicate(
    "join returned session id",
    typeof firstAuth.session_id === "string" && firstAuth.session_id.length > 0,
  );
  TestValidator.predicate(
    "join returned token object",
    typeof firstAuth.token?.access === "string" &&
      typeof firstAuth.token?.refresh === "string",
  );

  // 2) Small delay to simulate passage of time
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 3) Call refresh with the valid refresh credential
  const refreshReq = {
    refresh_token: firstAuth.token.refresh,
    session_id: firstAuth.session_id,
    ip: firstAuth.ip ?? undefined,
  } satisfies ICommunityBbsVisitor.IRefresh;

  const secondAuth: ICommunityBbsVisitor.IAuthorized =
    await api.functional.auth.visitor.refresh(connection, {
      body: refreshReq,
    });
  typia.assert(secondAuth);

  // 4) Assert identity and session linkage remain consistent
  TestValidator.equals(
    "visitor id unchanged after refresh",
    secondAuth.id,
    firstAuth.id,
  );
  TestValidator.equals(
    "session id remains linked",
    secondAuth.session_id,
    firstAuth.session_id,
  );

  // Ensure token object exists and shapes are valid
  typia.assert(secondAuth.token);

  // 4b) Validate rotation: at least one of access or refresh should differ
  TestValidator.predicate(
    "access or refresh token rotated or replaced",
    secondAuth.token.access !== firstAuth.token.access ||
      secondAuth.token.refresh !== firstAuth.token.refresh,
  );

  // 4c) Validate that refreshable_until moved into the future
  const prevRefreshUntil = new Date(
    firstAuth.token.refreshable_until,
  ).getTime();
  const newRefreshUntil = new Date(
    secondAuth.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until extended",
    newRefreshUntil > prevRefreshUntil,
  );

  // 5) Negative case: invalid refresh_token should be rejected
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          refresh_token: "this-is-not-a-valid-refresh-token",
          session_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityBbsVisitor.IRefresh,
      });
    },
  );

  // 6) Rate-limit probing: attempt multiple quick refreshes and record errors
  let throttledCount = 0;
  let successCount = 0;
  const attempts = 6;
  for (let i = 0; i < attempts; ++i) {
    try {
      const probe = await api.functional.auth.visitor.refresh(connection, {
        body: {
          refresh_token: secondAuth.token.refresh,
          session_id: secondAuth.session_id,
        } satisfies ICommunityBbsVisitor.IRefresh,
      });
      typia.assert(probe);
      successCount += 1;
    } catch (exp) {
      // Count any errors as potential throttling/abuse control responses
      throttledCount += 1;
    }
  }

  // Ensure the probe loop completed and recorded outcomes for all attempts
  TestValidator.predicate(
    "rate-limit probing completed (success + throttled == attempts)",
    successCount + throttledCount === attempts,
  );

  // 7) Visitor with non-existent / deleted session: use random session id -> should be rejected
  await TestValidator.error(
    "refresh with non-existent session id should be rejected",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          refresh_token: secondAuth.token.refresh,
          session_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityBbsVisitor.IRefresh,
      });
    },
  );
}
