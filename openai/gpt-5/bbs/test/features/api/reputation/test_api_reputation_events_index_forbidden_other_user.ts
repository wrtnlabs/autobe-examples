import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussReputationEvent";

/**
 * Ensure owner-only access on reputation event listing.
 *
 * Scenario:
 *
 * 1. Create two members: userB first (to store userB.id), then userA second so the
 *    active Authorization header is userA's token (SDK-managed).
 * 2. With userA's token, verify that listing userA's own reputation events
 *    succeeds and events (if any) reference userA.id.
 * 3. With userA's token, attempt to list userB's reputation events and expect an
 *    error (forbidden by policy). Do not check status codes; only verify that
 *    an error occurs.
 *
 * Notes:
 *
 * - Authentication headers are managed by the SDK; the test never touches
 *   connection.headers.
 * - Use typia.assert() for strict response shape validation.
 * - Use TestValidator.error with an async callback for the forbidden access case.
 */
export async function test_api_reputation_events_index_forbidden_other_user(
  connection: api.IConnection,
) {
  // 1) Register userB first to obtain another user's id
  const userBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const userBAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: userBBody });
  typia.assert(userBAuth);

  // 2) Register userA so that current Authorization header becomes userA's
  const userABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const userAAuth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: userABody });
  typia.assert(userAAuth);

  // 3) Positive control: owner can view own events
  const myEvents =
    await api.functional.econDiscuss.member.users.reputation.events.index(
      connection,
      { userId: userAAuth.id },
    );
  typia.assert(myEvents);
  await TestValidator.predicate(
    "owner can view own reputation events (all events belong to owner)",
    async () => myEvents.data.every((ev) => ev.userId === userAAuth.id),
  );

  // 4) Forbidden case: userA attempts to view userB's events
  await TestValidator.error(
    "non-owner cannot list another user's reputation events",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.index(
        connection,
        { userId: userBAuth.id },
      );
    },
  );
}
