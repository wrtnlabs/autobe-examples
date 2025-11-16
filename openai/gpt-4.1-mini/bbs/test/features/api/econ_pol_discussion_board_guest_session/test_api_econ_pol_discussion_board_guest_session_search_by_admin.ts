import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import type { IEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardGuestSession";

export async function test_api_econ_pol_discussion_board_guest_session_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(6)}`;
  const adminEmail = `${adminUsername}@example.com`;
  const adminPassword = "admin1234";
  const admin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconPolDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a guest user
  const guestUsername = `guest_${RandomGenerator.alphaNumeric(8)}`;
  const guestHref = `https://example.com/article/${RandomGenerator.alphaNumeric(8)}`;
  const guestReferrer = `https://referrer.com/page/${RandomGenerator.alphaNumeric(6)}`;
  const guest: IEconPolDiscussionBoardGuest =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.create(
      connection,
      {
        body: {
          username: guestUsername,
          ip: undefined,
          user_agent: undefined,
          href: guestHref,
          referrer: guestReferrer,
        } satisfies IEconPolDiscussionBoardGuest.ICreate,
      },
    );
  typia.assert(guest);

  // 3. Use admin credentials continues here as admin is authenticated

  // 4. Prepare a search request with pagination and filters
  const searchRequest: IEconPolDiscussionBoardGuestSession.IRequest = {
    guestId: guest.id,
    page: 1,
    limit: 10,
    search: null,
    sortBy: "created_at",
    sortOrder: "desc",
  };

  // 5. Admin requests the session search
  const sessionPage: IPageIEconPolDiscussionBoardGuestSession.ISummary =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardGuests.sessions.index(
      connection,
      {
        guestId: guest.id,
        body: searchRequest,
      },
    );
  typia.assert(sessionPage);

  // 6. Validate pagination data
  TestValidator.predicate(
    "pagination current page is 1",
    sessionPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    sessionPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages greater or equal to 1",
    sessionPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    sessionPage.pagination.records >= 0,
  );

  // 7. Validate that all returned session items have the guestId
  sessionPage.data.forEach((session, index) => {
    typia.assert(session);
    TestValidator.equals(
      `session ${index} linked to guestId`,
      session.econ_pol_discussion_board_guest_id,
      guest.id,
    );
    TestValidator.predicate(
      `session ${index} has UUID id format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      `session ${index} IP is non-empty string`,
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      `session ${index} href is non-empty string`,
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      `session ${index} referrer is non-empty string`,
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
    TestValidator.predicate(
      `session ${index} created_at is ISO string`,
      typeof session.created_at === "string" &&
        !isNaN(Date.parse(session.created_at)),
    );
    // expired_at can be null or undefined, validate type
    if (session.expired_at !== null && session.expired_at !== undefined) {
      TestValidator.predicate(
        `session ${index} expired_at is ISO string or null/undefined`,
        typeof session.expired_at === "string" &&
          !isNaN(Date.parse(session.expired_at)),
      );
    }
  });
}
