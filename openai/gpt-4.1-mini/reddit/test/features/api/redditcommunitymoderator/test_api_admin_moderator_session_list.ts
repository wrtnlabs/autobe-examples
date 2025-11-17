import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

/**
 * Validate the listing of paginated sessions for a reddit community moderator
 * from the admin perspective.
 *
 * This test simulates a scenario where an admin user signs up, creates a reddit
 * community moderator, and then retrieves the moderator's sessions using
 * pagination and filtering.
 *
 * The test ensures:
 *
 * 1. Admin user can register a new admin account successfully.
 * 2. Admin can create a reddit community moderator account.
 * 3. Sessions returned by the listing API correspond to the created moderator.
 * 4. Pagination and filtering parameters are respected.
 *
 * The test uses realistic random values for emails, URIs, and pagination
 * parameters, and ensures all returned data meets schema validation.
 */
export async function test_api_admin_moderator_session_list(
  connection: api.IConnection,
) {
  // Step 1: Admin user registers
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminReferrer = `https://${RandomGenerator.name(2).replace(/ /g, "")}.com`;
  const adminHref = `${adminReferrer}/signup`;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass1234!",
        href: adminHref,
        referrer: adminReferrer,
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Admin creates a reddit community moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: "ModeratorPass1234!",
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // Step 3: Admin queries the sessions of the moderator with filtering and pagination
  // Create realistic pagination parameters
  const page = RandomGenerator.pick([1, 2, 3, 4, 5] as const);
  const limit = RandomGenerator.pick([5, 10, 20, 50] as const);
  const orderBy = RandomGenerator.pick(["created_at", "ip"] as const);
  const orderDirection = RandomGenerator.pick(["asc", "desc"] as const);
  const search =
    RandomGenerator.substring("127.0.0.1 192.168.0.1") || undefined;

  const sessionsPage: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.admin.redditCommunityModerators.sessions.index(
      connection,
      {
        redditCommunityModeratorId: moderator.id,
        body: {
          page,
          limit,
          orderBy,
          orderDirection,
          search,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionsPage);

  // Verify pagination info
  TestValidator.predicate(
    "pagination current page valid",
    sessionsPage.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit valid",
    sessionsPage.pagination.limit === limit,
  );

  // Verify each session belongs to the moderator (session id format UUID and other props)
  for (const session of sessionsPage.data) {
    typia.assert(session);
    // Validate that the session ID is a UUID format string
    TestValidator.predicate(
      "session id UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    // Validate ip format (basic ipv4 regex accept)
    TestValidator.predicate(
      "session ip format",
      /^[0-9]{1,3}(?:\.[0-9]{1,3}){3}$/.test(session.ip),
    );
    // Referrer and href are non-empty strings
    TestValidator.predicate(
      "session href non-empty",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer non-empty",
      typeof session.referrer === "string",
    );
    // created_at and expired_at are ISO datetime strings or null for expired_at
    TestValidator.predicate(
      "session created_at ISO format",
      typeof session.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          session.created_at,
        ),
    );
    TestValidator.predicate(
      "session expired_at ISO or null",
      session.expired_at === null ||
        (typeof session.expired_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
            session.expired_at,
          )),
    );
  }
}
