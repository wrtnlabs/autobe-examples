import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an authenticated admin can search actor security events with
 * basic pagination and no additional filters.
 *
 * Business flow:
 *
 * 1. Register a new admin account using POST /auth/admin/join and obtain an
 *    authorized context (token is attached automatically to connection).
 * 2. Create multiple actor security events via POST
 *    /shoppingMall/admin/actorSecurityEvents with varying actor_type and
 *    event_type values.
 * 3. Call PATCH /shoppingMall/admin/actorSecurityEvents using
 *    IShoppingMallActorSecurityEvent.IRequest with only page and limit set,
 *    leaving all filters undefined.
 * 4. Verify that the returned page metadata is consistent with the number of
 *    created events and that the result data contain summaries matching the
 *    created events.
 * 5. Confirm that events are ordered by default order (assumed created_at
 *    descending) by comparing the order of IDs with the reverse of insertion
 *    order.
 */
export async function test_api_admin_actor_security_events_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create multiple actor security events with varying attributes
  const count = 5;
  const actorTypes = ["customer", "seller", "admin", "guestuser"] as const;
  const eventTypes = [
    "LOGIN_FAILED",
    "ACCOUNT_LOCKED",
    "PASSWORD_RESET_REQUESTED",
    "SESSION_REVOKED",
  ] as const;

  const createdEvents: IShoppingMallActorSecurityEvent[] =
    await ArrayUtil.asyncRepeat(count, async () => {
      const body = {
        actor_type: RandomGenerator.pick(actorTypes),
        event_type: RandomGenerator.pick(eventTypes),
        ip: RandomGenerator.alphabets(10),
        user_agent: RandomGenerator.paragraph({ sentences: 3 }),
        metadata: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallActorSecurityEvent.ICreate;

      const event: IShoppingMallActorSecurityEvent =
        await api.functional.shoppingMall.admin.actorSecurityEvents.create(
          connection,
          {
            body,
          },
        );
      typia.assert(event);
      return event;
    });

  // 3. Search with basic pagination and no additional filters
  const page = 1;
  const limit = 20;

  const requestBody = {
    page,
    limit,
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const pageResult: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const summaries = pageResult.data;

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page should match requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination pages should be positive",
    pagination.pages >= 1,
  );

  // 5. Verify that created events appear in the result set with matching fields
  const createdById = new Map<string, IShoppingMallActorSecurityEvent>();
  for (const ev of createdEvents) {
    createdById.set(ev.id, ev);
  }

  const foundCreatedEvents: IShoppingMallActorSecurityEvent[] = [];
  for (const summary of summaries) {
    const original = createdById.get(summary.id);
    if (!original) continue;

    // Cross-check key fields
    TestValidator.equals(
      `actor_type should match for event ${summary.id}`,
      summary.actor_type,
      original.actor_type,
    );
    TestValidator.equals(
      `event_type should match for event ${summary.id}`,
      summary.event_type,
      original.event_type,
    );
    TestValidator.equals(
      `created_at should match for event ${summary.id}`,
      summary.created_at,
      original.created_at,
    );

    // ip and user_agent are optional but if present, they should match
    if (original.ip !== null && original.ip !== undefined) {
      TestValidator.equals(
        `ip should match for event ${summary.id}`,
        summary.ip ?? null,
        original.ip,
      );
    }
    if (original.user_agent !== null && original.user_agent !== undefined) {
      TestValidator.equals(
        `user_agent should match for event ${summary.id}`,
        summary.user_agent ?? null,
        original.user_agent,
      );
    }

    foundCreatedEvents.push(original);
  }

  TestValidator.equals(
    "all created events should be present in search results (by id)",
    foundCreatedEvents.length,
    createdEvents.length,
  );

  // 6. Confirm default ordering (assumed created_at descending)
  const createdIdsInOrder = createdEvents.map((e) => e.id);
  const createdIdsInReverse = [...createdIdsInOrder].reverse();

  const summaryIdsForCreated = summaries
    .map((s) => s.id)
    .filter((id) => createdById.has(id));

  TestValidator.equals(
    "created event IDs should appear in reverse insertion order in search results",
    summaryIdsForCreated,
    createdIdsInReverse,
  );
}
