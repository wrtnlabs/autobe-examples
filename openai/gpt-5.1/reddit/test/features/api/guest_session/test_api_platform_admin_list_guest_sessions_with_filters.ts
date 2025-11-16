import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuserSession";

export async function test_api_platform_admin_list_guest_sessions_with_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "192.168.0.10",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Ensure at least one account status exists so that other actors can reference it.
  //    Even though this test does not directly create guest users or sessions,
  //    we follow the dependency contract by provisioning a status row.
  const statusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const status: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(status);

  // 3. Build a defensive filter request. We cannot actually create guest users
  //    or sessions with the available APIs, so we:
  //    - pick a random guestUserId (the backend or simulator may or may not
  //      have data for it), and
  //    - focus on validating that, WHEN the backend returns data, it respects
  //      the filter semantics expressed in IRequest.

  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago

  const createdFrom = past.toISOString();
  const createdTo = now.toISOString();

  // For last_activity_from/to we reuse the same window; the simulator does not
  // expose last_activity_at fields explicitly, so we only check created_at
  // window where it makes sense. Still, we pass them through to exercise the
  // DTO surface.
  const lastActivityFrom = createdFrom;
  const lastActivityTo = createdTo;

  const ipLike = "192.168";
  const userAgentLike = "Mozilla";

  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
    created_from: createdFrom as string & tags.Format<"date-time">,
    created_to: createdTo as string & tags.Format<"date-time">,
    last_activity_from: lastActivityFrom as string & tags.Format<"date-time">,
    last_activity_to: lastActivityTo as string & tags.Format<"date-time">,
    ip_like: ipLike,
    user_agent_like: userAgentLike,
    active_only: true,
  } satisfies ICommunityPlatformGuestuserSession.IRequest;

  // 4. Execute the guest user session listing for a random guestId.
  //    NOTE: We rely on the simulator or existing data; if no data exists,
  //    we still validate type-level guarantees and pagination invariants.
  const guestUserId = typia.random<string & tags.Format<"uuid">>();

  const page: IPageICommunityPlatformGuestuserSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: requestBody,
      },
    );
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  const sessions: ICommunityPlatformGuestuserSession.ISummary[] = page.data;

  // Basic pagination invariants: limit and current are non-negative and
  // data length does not exceed limit.
  TestValidator.predicate(
    "sessions page limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "sessions page current index should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "sessions data length must not exceed limit when limit > 0",
    pagination.limit === 0 || sessions.length <= pagination.limit,
  );

  // If there are any records, records and pages metadata should be positive.
  if (sessions.length > 0) {
    TestValidator.predicate(
      "sessions pagination records should be positive when data exists",
      pagination.records > 0,
    );
    TestValidator.predicate(
      "sessions pagination pages should be positive when data exists",
      pagination.pages > 0,
    );
  }

  // 5. Business-filter validations applied to each returned session.
  for (const session of sessions) {
    // created_at should be inside [created_from, created_to]
    const createdAtTime = Date.parse(session.created_at);
    const createdFromTime = Date.parse(createdFrom);
    const createdToTime = Date.parse(createdTo);

    TestValidator.predicate(
      "session created_at should be within created_from/to window",
      createdAtTime >= createdFromTime && createdAtTime <= createdToTime,
    );

    // IP filter: ip should contain the ip_like substring when provided
    if (ipLike !== undefined) {
      TestValidator.predicate(
        "session ip should contain ip_like substring",
        session.ip.includes(ipLike),
      );
    }

    // User-agent filter: we do not have a user_agent field in ISummary, so we
    // cannot assert it directly. However, we at least assert that the DTO is
    // correctly shaped via typia.assert above and document the limitation here.

    // Active-only filter: when active_only=true, expired_at must be undefined.
    TestValidator.predicate(
      "session expired_at should be undefined when active_only is true",
      session.expired_at === undefined,
    );

    // Guest user ownership: ensure the embedded guestUser id is a UUID and not
    // empty, reinforcing that results belong to a concrete guest user.
    const guestSummary = session.guestUser;
    TestValidator.predicate(
      "embedded guestUser id must be a non-empty string",
      typeof guestSummary.id === "string" && guestSummary.id.length > 0,
    );
  }
}
