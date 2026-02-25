import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_retrieve_all(
  connection: api.IConnection,
): Promise<void> {
  // Guest joins the platform to obtain guest tokens
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestAuth: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestJoinConnection, {
      body: { deviceFingerprint: RandomGenerator.alphaNumeric(32) },
    });
  // Setup authenticated connection for guest
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = { Authorization: `Bearer ${guestAuth.access}` };
  // Retrieve user sessions list without filters (empty request body)
  const requestBody: ICommunityPlatformUserSession.IRequest = {};
  const sessionsPage: IPageICommunityPlatformUserSession.ISummary =
    await api.functional.communityPlatform.guest.sessions.index(
      guestConnection,
      { body: requestBody },
    );
  // Validate response structure
  typia.assert(sessionsPage);
  // Validate pagination information is properly filled
  TestValidator.predicate(
    "pagination current page >= 0",
    sessionsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    sessionsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    sessionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    sessionsPage.pagination.pages >= 0,
  );
  // Validate data list
  TestValidator.predicate(
    "data array is array",
    Array.isArray(sessionsPage.data),
  );
  // For each session summary in data
  for (const session of sessionsPage.data) {
    // Validate session summary structure
    typia.assert(session);
    // Session id is a UUID string
    TestValidator.predicate(
      "session id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    // IP is non-empty string
    TestValidator.predicate(
      "ip is non-empty",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    // href is non-empty string
    TestValidator.predicate(
      "href is non-empty",
      typeof session.href === "string" && session.href.length > 0,
    );
    // referrer is string (nullable checked by typia.assert) but expected non-empty
    TestValidator.predicate(
      "referrer is string",
      typeof session.referrer === "string",
    );
    // createdAt and expiredAt are ISO date-time strings
    TestValidator.predicate(
      "createdAt is ISO date-time",
      typeof session.createdAt === "string" &&
        !isNaN(Date.parse(session.createdAt)),
    );
    TestValidator.predicate(
      "expiredAt is ISO date-time",
      typeof session.expiredAt === "string" &&
        !isNaN(Date.parse(session.expiredAt)),
    );
    // deletedAt is either null or ISO date-time string
    if (session.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt is ISO date-time when not null",
        typeof session.deletedAt === "string" &&
          !isNaN(Date.parse(session.deletedAt)),
      );
    }
    // User summary inside session
    typia.assert(session.user);
    // Check user summary required fields
    const user = session.user;
    TestValidator.predicate(
      "user id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.id,
      ),
    );
    TestValidator.predicate(
      "user email is string",
      typeof user.email === "string" && user.email.length > 0,
    );
    TestValidator.predicate(
      "user username is string",
      typeof user.username === "string" && user.username.length > 0,
    );
    TestValidator.predicate(
      "user displayName is string",
      typeof user.displayName === "string" && user.displayName.length > 0,
    );
    TestValidator.predicate(
      "user karma is number",
      typeof user.karma === "number",
    );
    TestValidator.predicate(
      "user createdAt is ISO date-time",
      typeof user.createdAt === "string" && !isNaN(Date.parse(user.createdAt)),
    );
    TestValidator.predicate(
      "user updatedAt is ISO date-time",
      typeof user.updatedAt === "string" && !isNaN(Date.parse(user.updatedAt)),
    );
    // deletedAt in user summary is either null or ISO date-time string
    if (user.deletedAt !== null) {
      TestValidator.predicate(
        "user deletedAt is ISO date-time when not null",
        typeof user.deletedAt === "string" &&
          !isNaN(Date.parse(user.deletedAt)),
      );
    }
    // bio and avatarUrl are nullable string or undefined, typia.assert allows it
  }
}
