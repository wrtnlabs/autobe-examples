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
 * List own reputation events and validate empty page for a fresh member.
 *
 * Business goals
 *
 * - A newly joined member should be able to list their own reputation events and
 *   see an empty page (no events yet).
 * - Enforce authentication boundary (unauthenticated access must fail).
 * - Enforce owner-only scope (another member cannot read someone else’s events).
 *
 * Steps
 *
 * 1. Join Member A and capture id and token (SDK auto-sets Authorization).
 * 2. GET events for Member A → expect a valid page with empty data array.
 * 3. Using an unauthenticated connection, attempt GET → expect error.
 * 4. Join Member B (switches token), attempt GET for Member A’s id → expect error.
 */
export async function test_api_reputation_events_index_owner_empty_page(
  connection: api.IConnection,
) {
  // 1) Join Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const joinABody = {
    email: memberAEmail,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorizedA = await api.functional.auth.member.join(connection, {
    body: joinABody,
  });
  typia.assert(authorizedA);
  const userIdA = authorizedA.id;

  // 2) Owner lists their reputation events → expect empty page
  const pageA =
    await api.functional.econDiscuss.member.users.reputation.events.index(
      connection,
      { userId: userIdA },
    );
  typia.assert(pageA);
  TestValidator.equals("owner sees empty data initially", pageA.data.length, 0);
  TestValidator.equals(
    "owner page has zero total records initially",
    pageA.pagination.records,
    0,
  );

  // 3) Auth boundary: unauthenticated access must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to reputation events should fail",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.index(
        unauthConn,
        { userId: userIdA },
      );
    },
  );

  // 4) Owner-only scope: other member token cannot read A's events
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const joinBBody = {
    email: memberBEmail,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorizedB = await api.functional.auth.member.join(connection, {
    body: joinBBody,
  });
  typia.assert(authorizedB);

  await TestValidator.error(
    "other member cannot access someone else's reputation events",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.index(
        connection,
        { userId: userIdA },
      );
    },
  );

  // Optional symmetry: Member B's own events should also be empty initially.
  const pageB =
    await api.functional.econDiscuss.member.users.reputation.events.index(
      connection,
      { userId: authorizedB.id },
    );
  typia.assert(pageB);
  TestValidator.equals("member B initial data is empty", pageB.data.length, 0);
}
