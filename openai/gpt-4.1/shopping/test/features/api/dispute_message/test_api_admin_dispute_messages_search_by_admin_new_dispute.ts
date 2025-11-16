import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDisputeMessage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeMessage";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin's ability to retrieve dispute messages for a newly created
 * dispute, with advanced filtering and pagination.
 *
 * 1. Register a new admin user (join, twice to prevent pollution)
 * 2. Authenticate as the admin
 * 3. Create a new dispute as admin (simulate customer and seller IDs)
 * 4. Retrieve dispute messages:
 *
 *    - Full listing (empty filter)
 *    - Filter by sender_admin_id
 *    - Filter by role "admin"
 *    - Filter by content_contains (if applicable)
 *    - Filter by date range (created_at_from/to)
 *    - Pagination (e.g., page=1, limit=2)
 *    - Sorting by created_at asc/desc
 *    - Check that only messages for the created dispute are returned, and admin sees
 *         correct messages
 *    - Assert unauthorized access (by using wrong dispute ID or unauthenticated
 *         conn) is rejected
 */
export async function test_api_admin_dispute_messages_search_by_admin_new_dispute(
  connection: api.IConnection,
) {
  // 1. Register two admins to avoid test pollution / duplicate email
  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminA);
  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminB);

  // 2. Create new dispute as adminA
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const dispute = await api.functional.shoppingMall.admin.disputes.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_seller_id: sellerId,
        status: "open",
        subject: RandomGenerator.paragraph({ sentences: 2 }),
        root_cause: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallDispute.ICreate,
    },
  );
  typia.assert(dispute);

  // 3. Retrieve dispute messages for the new dispute with various filters:
  // a) Full listing (unfiltered)
  const allMessages =
    await api.functional.shoppingMall.admin.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {},
      },
    );
  typia.assert(allMessages);
  TestValidator.predicate(
    "all messages must belong to the created dispute",
    allMessages.data.every((msg) => msg.dispute.id === dispute.id),
  );

  // b) By sender_admin_id (should be either null or admin if any admin messages exist)
  const bySenderAdmin =
    await api.functional.shoppingMall.admin.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          sender_admin_id: adminA.id,
        },
      },
    );
  typia.assert(bySenderAdmin);
  TestValidator.predicate(
    "if present, all sender_admin_id match",
    bySenderAdmin.data.every(
      (msg) => msg.sender_admin?.id === adminA.id || msg.sender_admin == null,
    ),
  );

  // c) By sender role 'admin'
  const byRoleAdmin =
    await api.functional.shoppingMall.admin.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          role: "admin",
        },
      },
    );
  typia.assert(byRoleAdmin);
  TestValidator.predicate(
    "role filter works (all are admin)",
    byRoleAdmin.data.every((msg) => msg.role === "admin"),
  );

  // d) By content_contains (simulate with some text from prior message, if exists)
  let substring: string | null = null;
  if (allMessages.data.length > 0) {
    substring = RandomGenerator.substring(allMessages.data[0].content);
    const byContent =
      await api.functional.shoppingMall.admin.disputes.messages.index(
        connection,
        {
          disputeId: dispute.id,
          body: { content_contains: substring },
        },
      );
    typia.assert(byContent);
    TestValidator.predicate(
      "content_contains filter matches",
      byContent.data.every((msg) => msg.content.includes(substring!)),
    );
  }

  // e) Date range filter (created_at_from / to). Use the min/max of returned messages for range
  if (allMessages.data.length > 0) {
    const dates = allMessages.data.map((msg) => msg.created_at);
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    const byDate =
      await api.functional.shoppingMall.admin.disputes.messages.index(
        connection,
        {
          disputeId: dispute.id,
          body: {
            created_at_from: minDate,
            created_at_to: maxDate,
          },
        },
      );
    typia.assert(byDate);
    TestValidator.predicate(
      "date range filter matches",
      byDate.data.every(
        (msg) => msg.created_at >= minDate && msg.created_at <= maxDate,
      ),
    );
  }

  // f) Pagination (e.g. page = 1, limit = 2)
  const paged = await api.functional.shoppingMall.admin.disputes.messages.index(
    connection,
    {
      disputeId: dispute.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(paged);
  TestValidator.equals(
    "returned messages <= limit",
    paged.data.length <= 2,
    true,
  );

  // g) Sorting asc/desc
  const ascSort =
    await api.functional.shoppingMall.admin.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: { sort_by: "created_at", order: "asc" },
      },
    );
  typia.assert(ascSort);
  TestValidator.predicate(
    "messages sorted ascending by created_at",
    ascSort.data.every(
      (msg, i, arr) => i === 0 || msg.created_at >= arr[i - 1].created_at,
    ),
  );
  const descSort =
    await api.functional.shoppingMall.admin.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: { sort_by: "created_at", order: "desc" },
      },
    );
  typia.assert(descSort);
  TestValidator.predicate(
    "messages sorted descending by created_at",
    descSort.data.every(
      (msg, i, arr) => i === 0 || msg.created_at <= arr[i - 1].created_at,
    ),
  );

  // h) Unauthorized query (wrong dispute ID)
  await TestValidator.error(
    "unauthorized access to random disputeId should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.disputes.messages.index(
        connection,
        {
          disputeId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
}
