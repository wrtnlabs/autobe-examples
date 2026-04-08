import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuestSession";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_listing_without_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session using utility function
  const guestAuthorized = await authorize_guest_join(connection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create actor-specific connection with guest token
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuthorized.token.access}`,
  };
  // 3. Call guest sessions index endpoint without any filters
  const response = await api.functional.redditClone.guest.guest_sessions.index(
    guestConnection,
    {
      body: {} satisfies IRedditCloneGuestSession.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination object structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", response.pagination.limit >= 0);
  TestValidator.predicate("records is valid", response.pagination.records >= 0);
  TestValidator.predicate("pages is valid", response.pagination.pages >= 0);
  // 5. Validate each session in data array has required fields
  for (const session of response.data) {
    TestValidator.predicate(
      "session has id",
      session.id !== null && session.id !== undefined,
    );
    TestValidator.predicate(
      "session has ip",
      session.ip !== null && session.ip !== undefined,
    );
    TestValidator.predicate(
      "session has href",
      session.href !== null && session.href !== undefined,
    );
    TestValidator.predicate(
      "session has referrer",
      session.referrer !== null && session.referrer !== undefined,
    );
    TestValidator.predicate(
      "session has created_at",
      session.created_at !== null && session.created_at !== undefined,
    );
    TestValidator.predicate(
      "session has expired_at",
      session.expired_at !== null && session.expired_at !== undefined,
    );
    TestValidator.predicate(
      "session has guest summary",
      session.guest !== null && session.guest !== undefined,
    );
    // Validate guest summary fields
    if (session.guest) {
      TestValidator.predicate(
        "guest has id",
        session.guest.id !== null && session.guest.id !== undefined,
      );
      TestValidator.predicate(
        "guest has fingerprint",
        session.guest.fingerprint !== null &&
          session.guest.fingerprint !== undefined,
      );
    }
  }
  // 6. Validate ordering by created_at descending (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sessions ordered by created_at descending (newest first) at index ${i}`,
        current >= next,
      );
    }
  }
}
