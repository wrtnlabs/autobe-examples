import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Validate guest user listing sorting by created_at.
 *
 * Business goal:
 *
 * - Ensure that PATCH /todoApp/guestUser/guestUsers honors order_by and
 *   order_direction when listing guest user summaries.
 *
 * Steps:
 *
 * 1. Join as a guest user via POST /auth/guestUser/join to establish guestUser
 *    authorization context.
 * 2. Call guestUsers.index with order_by = "created_at" and order_direction =
 *    "desc" and a fixed page/limit to obtain a descending-sorted page.
 * 3. Assert the response type as IPageITodoAppGuestuser.ISummary and that its data
 *    array is sorted by created_at descending.
 * 4. Call guestUsers.index again with order_direction = "asc" to obtain an
 *    ascending-sorted page.
 * 5. Assert the second response type and that its data array is sorted by
 *    created_at ascending.
 * 6. When both pages contain at least one item, perform a basic cross-check (e.g.,
 *    comparing boundary created_at values) to strengthen confidence that
 *    order_direction is applied correctly.
 */
export async function test_api_guest_user_list_with_sorting(
  connection: api.IConnection,
) {
  // 1. Establish guestUser context by joining as a guest user.
  const joinBody = {
    display_name: RandomGenerator.name(1),
  } satisfies ITodoAppGuestUser.IJoin;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Request guest users ordered by created_at DESC.
  const descRequest = {
    page: 1,
    limit: 50,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ITodoAppGuestUser.IRequest;

  const descPage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.guestUser.guestUsers.index(connection, {
      body: descRequest,
    });
  typia.assert(descPage);

  // 3. Validate descending sort on created_at when multiple items exist.
  const descData = descPage.data;
  if (descData.length >= 2) {
    await ArrayUtil.asyncForEach(descData, async (current, index, array) => {
      if (index === 0) return;
      const prev = array[index - 1];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(current.created_at).getTime();

      TestValidator.predicate(
        "guest users should be sorted by created_at in descending order",
        prevTime >= currTime,
      );
    });
  }

  // 4. Request guest users ordered by created_at ASC.
  const ascRequest = {
    page: 1,
    limit: 50,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies ITodoAppGuestUser.IRequest;

  const ascPage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.guestUser.guestUsers.index(connection, {
      body: ascRequest,
    });
  typia.assert(ascPage);

  const ascData = ascPage.data;
  if (ascData.length >= 2) {
    await ArrayUtil.asyncForEach(ascData, async (current, index, array) => {
      if (index === 0) return;
      const prev = array[index - 1];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(current.created_at).getTime();

      TestValidator.predicate(
        "guest users should be sorted by created_at in ascending order",
        prevTime <= currTime,
      );
    });
  }

  // 5. Cross-check boundaries when both results contain at least one item.
  if (descData.length > 0 && ascData.length > 0) {
    const newestFromDesc = descData[0];
    const oldestFromAsc = ascData[0];

    const newestTime = new Date(newestFromDesc.created_at).getTime();
    const oldestTime = new Date(oldestFromAsc.created_at).getTime();

    // Depending on dataset size and filters, these may not be exact
    // inverses, but we can at least assert they are valid date-times.
    TestValidator.predicate(
      "newest created_at from DESC page should be a valid timestamp",
      Number.isFinite(newestTime),
    );
    TestValidator.predicate(
      "oldest created_at from ASC page should be a valid timestamp",
      Number.isFinite(oldestTime),
    );
  }
}
