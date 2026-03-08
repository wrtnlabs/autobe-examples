import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_guest_session_tracking_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create multiple guest sessions by calling the index endpoint with different pagination parameters
  // First, get the first page with limit 2
  const page1 = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        page: 1,
        limit: 2,
        sort_by: "created_at",
        order: "desc",
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "pagination has records",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", page1.pagination.pages >= 0);
  // 4. Validate session data structure
  if (page1.data.length > 0) {
    const session = page1.data[0];
    TestValidator.equals("session type is guest", session.type, "guest");
    TestValidator.predicate("session has valid IP", session.ip.length > 0);
    TestValidator.predicate("session has valid href", session.href.length > 0);
    TestValidator.predicate(
      "session has valid created_at",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has valid expired_at",
      session.expired_at.length > 0,
    );
    // Validate user information
    TestValidator.predicate("user has id", session.user.id.length > 0);
    TestValidator.predicate(
      "user has display name",
      session.user.displayName.length > 0,
    );
    TestValidator.predicate(
      "user has article count",
      session.user.articleCount >= 0,
    );
    TestValidator.predicate(
      "user has comment count",
      session.user.commentCount >= 0,
    );
  }
  // 5. Test pagination with second page (if there are more records)
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.discussionBoard.admin.guests.index(
      adminConnection,
      {
        body: {
          session_type: "guest",
          page: 2,
          limit: 2,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current page",
      page2.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "page 2 has different data",
      page1.data.length,
      page2.data.length,
    );
  }
  // 6. Test sorting by created_at descending
  if (page1.data.length > 1) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const current = new Date(page1.data[i].created_at).getTime();
      const next = new Date(page1.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `session ${i} is newer than or equal to session ${i + 1}`,
        current >= next,
      );
    }
  }
}
