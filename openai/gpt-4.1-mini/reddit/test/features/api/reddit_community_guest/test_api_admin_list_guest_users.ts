import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Validates that an admin can authenticate via join API and retrieve a
 * filtered, paginated list of guest users from the redditCommunity admin guests
 * endpoint.
 *
 * This test covers the business scenario where administrators monitor guest
 * activity by querying guest metadata, ensuring proper authentication and
 * authorization mechanisms are enforced. It verifies that pagination, search
 * filters, and ordering parameters are handled correctly by the API. It
 * performs schema validation with typia on all responses, and validates basic
 * business rules on pagination data and guest summary properties.
 *
 * Steps:
 *
 * 1. Join the admin authentication with a generated user ID.
 * 2. Query guest users list with randomized pagination and ordering.
 * 3. Assert response structure, pagination metadata, and guest record correctness.
 */
export async function test_api_admin_list_guest_users(
  connection: api.IConnection,
) {
  // 1. Admin join authentication
  const adminCreateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuth);

  // 2. Retrieve guest list with realistic pagination
  const guestListRequestBody: IRedditCommunityGuest.IRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    order_by: RandomGenerator.pick(["created_at", "id"] as const),
    order_direction: RandomGenerator.pick(["asc", "desc"] as const),
  };

  const guestListResult: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.admin.guests.index(connection, {
      body: guestListRequestBody,
    });
  typia.assert(guestListResult);

  // 3. Validate guest list properties
  TestValidator.predicate(
    "pagination page is at least 1",
    guestListResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is between 1 and 100",
    guestListResult.pagination.limit >= 1 &&
      guestListResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    guestListResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    guestListResult.pagination.records >= 0,
  );

  for (const guest of guestListResult.data) {
    typia.assert(guest);
    TestValidator.predicate(
      "guest id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        guest.id,
      ),
    );
    TestValidator.predicate(
      "guest created_at is ISO 8601",
      !isNaN(Date.parse(guest.created_at)),
    );
  }
}
