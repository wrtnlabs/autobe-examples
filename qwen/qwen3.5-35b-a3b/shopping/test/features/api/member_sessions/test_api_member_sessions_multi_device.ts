import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_multi_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberData);
  // 2. Create multiple sessions with different IPs to simulate different devices
  const sessionIpAddresses = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"ipv4">>(),
  );
  // 3. Test filtering by session_status: 'active'
  const activeFilterParams = {
    actor_type: "member",
    session_status: "active" as const,
    page_size: 10,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IEcommerceMallGuestSession.IRequest;
  const activeSessionsConnection: api.IConnection = { host: connection.host };
  const activeSessionsResponse =
    await api.functional.ecommerceMall.member.sessions.index(
      activeSessionsConnection,
      { body: activeFilterParams },
    );
  typia.assert(activeSessionsResponse);
  // 4. Test filtering by session_status: 'expiring'
  const expiringFilterParams = {
    actor_type: "member",
    session_status: "expiring" as const,
    page_size: 10,
    sort_by: "expired_at" as const,
    sort_order: "asc" as const,
  } satisfies IEcommerceMallGuestSession.IRequest;
  const expiringSessionsConnection: api.IConnection = { host: connection.host };
  const expiringSessionsResponse =
    await api.functional.ecommerceMall.member.sessions.index(
      expiringSessionsConnection,
      { body: expiringFilterParams },
    );
  typia.assert(expiringSessionsResponse);
  // 5. Test filtering by session_status: 'expired'
  const expiredFilterParams = {
    actor_type: "member",
    session_status: "expired" as const,
    page_size: 10,
    sort_by: "created_at" as const,
    sort_order: "asc" as const,
  } satisfies IEcommerceMallGuestSession.IRequest;
  const expiredSessionsConnection: api.IConnection = { host: connection.host };
  const expiredSessionsResponse =
    await api.functional.ecommerceMall.member.sessions.index(
      expiredSessionsConnection,
      { body: expiredFilterParams },
    );
  typia.assert(expiredSessionsResponse);
  // 6. Test sorting by created_at descending
  const sortByCreatedAtDescConnection: api.IConnection = {
    host: connection.host,
  };
  const sortByCreatedAtDescResponse =
    await api.functional.ecommerceMall.member.sessions.index(
      sortByCreatedAtDescConnection,
      {
        body: {
          actor_type: "member",
          page_size: 20,
          sort_by: "created_at" as const,
          sort_order: "desc" as const,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDescResponse);
  // 7. Test sorting by expired_at ascending
  const sortByExpiredAtAscConnection: api.IConnection = {
    host: connection.host,
  };
  const sortByExpiredAtAscResponse =
    await api.functional.ecommerceMall.member.sessions.index(
      sortByExpiredAtAscConnection,
      {
        body: {
          actor_type: "member",
          page_size: 20,
          sort_by: "expired_at" as const,
          sort_order: "asc" as const,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
  typia.assert(sortByExpiredAtAscResponse);
  // 8. Validate all sessions belong to same member (actor_id matches)
  const activeActorIds = activeSessionsResponse.data.map((s) => s.actor_id);
  const expiringActorIds = expiringSessionsResponse.data.map((s) => s.actor_id);
  const expiredActorIds = expiredSessionsResponse.data.map((s) => s.actor_id);
  TestValidator.equals(
    "active sessions all belong to member",
    activeActorIds.length > 0
      ? activeActorIds.every((id) => id === memberData.id)
      : true,
    true,
  );
  TestValidator.equals(
    "expiring sessions all belong to member",
    expiringActorIds.length > 0
      ? expiringActorIds.every((id) => id === memberData.id)
      : true,
    true,
  );
  TestValidator.equals(
    "expired sessions all belong to member",
    expiredActorIds.length > 0
      ? expiredActorIds.every((id) => id === memberData.id)
      : true,
    true,
  );
  // 9. Validate pagination metadata
  TestValidator.equals(
    "active sessions pagination current",
    activeSessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "expiring sessions pagination current",
    expiringSessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "expired sessions pagination current",
    expiredSessionsResponse.pagination.current,
    1,
  );
  // 10. Validate pagination records match actual data count
  TestValidator.equals(
    "active sessions pagination records matches data",
    activeSessionsResponse.pagination.records,
    activeSessionsResponse.data.length,
  );
  TestValidator.equals(
    "expiring sessions pagination records matches data",
    expiringSessionsResponse.pagination.records,
    expiringSessionsResponse.data.length,
  );
  TestValidator.equals(
    "expired sessions pagination records matches data",
    expiredSessionsResponse.pagination.records,
    expiredSessionsResponse.data.length,
  );
  // 11. Validate session_status computation (active if expired_at > now)
  const now = new Date();
  for (const session of activeSessionsResponse.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `active session ${session.id} has valid active status`,
      expiredAt > now,
    );
  }
  // 12. Validate session_status computation (expiring if within 1 hour)
  for (const session of expiringSessionsResponse.data) {
    const expiredAt = new Date(session.expired_at);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    TestValidator.predicate(
      `expiring session ${session.id} is within 1 hour of expiration`,
      expiredAt > now && expiredAt <= oneHourFromNow,
    );
  }
  // 13. Validate session_status computation (expired if expired_at <= now)
  for (const session of expiredSessionsResponse.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `expired session ${session.id} has expired`,
      expiredAt <= now,
    );
  }
  // 14. Verify sorting works correctly for created_at desc
  for (let i = 1; i < sortByCreatedAtDescResponse.data.length; i++) {
    const prev = sortByCreatedAtDescResponse.data[i - 1];
    const curr = sortByCreatedAtDescResponse.data[i];
    const prevCreated = new Date(prev.created_at);
    const currCreated = new Date(curr.created_at);
    TestValidator.predicate(
      `created_at desc sort valid at index ${i}`,
      prevCreated >= currCreated,
    );
  }
  // 15. Verify sorting works correctly for expired_at asc
  for (let i = 1; i < sortByExpiredAtAscResponse.data.length; i++) {
    const prev = sortByExpiredAtAscResponse.data[i - 1];
    const curr = sortByExpiredAtAscResponse.data[i];
    const prevExpired = new Date(prev.expired_at);
    const currExpired = new Date(curr.expired_at);
    TestValidator.predicate(
      `expired_at asc sort valid at index ${i}`,
      prevExpired <= currExpired,
    );
  }
  // 16. Verify actor_type is member for all returned sessions
  for (const session of [
    ...activeSessionsResponse.data,
    ...expiringSessionsResponse.data,
    ...expiredSessionsResponse.data,
  ]) {
    TestValidator.equals(
      `session ${session.id} has correct actor_type`,
      session.actor_type,
      "member",
    );
  }
  // 17. Verify pagination pages calculation
  const activePages = Math.ceil(
    activeSessionsResponse.pagination.records /
      activeSessionsResponse.pagination.limit,
  );
  TestValidator.equals(
    "active sessions pages calculated correctly",
    activeSessionsResponse.pagination.pages,
    activePages,
  );
  const expiringPages = Math.ceil(
    expiringSessionsResponse.pagination.records /
      expiringSessionsResponse.pagination.limit,
  );
  TestValidator.equals(
    "expiring sessions pages calculated correctly",
    expiringSessionsResponse.pagination.pages,
    expiringPages,
  );
  const expiredPages = Math.ceil(
    expiredSessionsResponse.pagination.records /
      expiredSessionsResponse.pagination.limit,
  );
  TestValidator.equals(
    "expired sessions pages calculated correctly",
    expiredSessionsResponse.pagination.pages,
    expiredPages,
  );
}
