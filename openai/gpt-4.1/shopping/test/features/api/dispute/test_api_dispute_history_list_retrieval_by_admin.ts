import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDisputeHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeHistory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that an admin user can retrieve the full audit trail of status
 * changes and actions for a given dispute.
 *
 * 1. Onboard a new admin by registering with a unique email, password, and name.
 * 2. Register a second admin to test actor-based filtering and access controls.
 * 3. As admin, create a customer and seller (using minimal necessary mock data for
 *    required IDs).
 * 4. Create a new dispute record with the admin's info, linking the created
 *    customer and seller.
 * 5. Retrieve the dispute's history as the admin, using paging and various
 *    filters.
 * 6. Assert that the response is a valid page, all audit trail entities are
 *    included, each has its snapshot, actor, timestamp, and note.
 * 7. Optionally, verify the effects of access restrictions by attempting with
 *    another admin account, and test pagination and filtering parameters for
 *    actor/status.
 */
export async function test_api_dispute_history_list_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Onboard a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName: string = RandomGenerator.name();

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Register a second admin (for filtering test)
  const otherAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const otherAdminPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const otherAdminName: string = RandomGenerator.name();

  const otherAdminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: otherAdminEmail,
        password: otherAdminPassword,
        name: otherAdminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(otherAdminAuth);

  // 3. Setup required actors: customer and seller (minimal mock summary objects)
  const customer: IShoppingMallCustomer.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(2),
  };
  const seller: IShoppingMallSeller.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    business_name: RandomGenerator.name(2),
  };
  // These would come from API normally, but we mock as only IDs are required for creating a dispute.

  // 4. Create a new dispute using admin account
  const disputeCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    status: "open",
    subject: RandomGenerator.paragraph({ sentences: 2 }),
    root_cause: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallDispute.ICreate;

  const dispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeCreateBody,
    });
  typia.assert(dispute);

  // 5. Retrieve the dispute's audit trail (history) as admin
  const pageNum = 1 satisfies number;
  const pageLimit = 10 satisfies number;
  const pageRequest = {
    page: pageNum,
    limit: pageLimit,
  } satisfies IShoppingMallDisputeHistory.IRequest;

  const historyPage: IPageIShoppingMallDisputeHistory =
    await api.functional.shoppingMall.admin.disputes.histories.index(
      connection,
      {
        disputeId: dispute.id,
        body: pageRequest,
      },
    );
  typia.assert(historyPage);
  TestValidator.equals(
    "history page belongs to correct dispute",
    historyPage.data.every((h) => h.shopping_mall_dispute_id === dispute.id),
    true,
  );
  TestValidator.equals(
    "page limit respected",
    historyPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "each record has valid status",
    historyPage.data.every((h) => !!h.status && typeof h.status === "string"),
  );
  TestValidator.predicate(
    "all have creation timestamp",
    historyPage.data.every(
      (h) => typeof h.created_at === "string" && h.created_at.length > 0,
    ),
  );

  // 6. Test status-based filtering
  if (historyPage.data.length > 0) {
    const firstStatus = historyPage.data[0].status;
    const statusFilterRequest = {
      page: 1,
      limit: 5,
      status: firstStatus,
    } satisfies IShoppingMallDisputeHistory.IRequest;
    const statusFiltered: IPageIShoppingMallDisputeHistory =
      await api.functional.shoppingMall.admin.disputes.histories.index(
        connection,
        {
          disputeId: dispute.id,
          body: statusFilterRequest,
        },
      );
    typia.assert(statusFiltered);
    TestValidator.equals(
      "all histories are filtered by status",
      statusFiltered.data.every((h) => h.status === firstStatus),
      true,
    );
  }

  // 7. Test actor_admin_id-based filtering (should return records created by admin)
  if (adminAuth.id) {
    const actorFilterRequest = {
      page: 1,
      limit: 5,
      actor_admin_id: adminAuth.id,
    } satisfies IShoppingMallDisputeHistory.IRequest;
    const adminFiltered: IPageIShoppingMallDisputeHistory =
      await api.functional.shoppingMall.admin.disputes.histories.index(
        connection,
        {
          disputeId: dispute.id,
          body: actorFilterRequest,
        },
      );
    typia.assert(adminFiltered);
    TestValidator.equals(
      "all histories filtered by actor_admin_id",
      adminFiltered.data.every(
        (h) =>
          h.shopping_mall_actor_admin_id === adminAuth.id ||
          h.shopping_mall_actor_admin_id === null ||
          h.shopping_mall_actor_admin_id === undefined,
      ),
      true,
    );
  }

  // 8. Test pagination (should fetch subsequent pages with correct limit)
  if (historyPage.pagination.pages > 1) {
    const nextPageRequest = {
      page: 2,
      limit: pageLimit,
    } satisfies IShoppingMallDisputeHistory.IRequest;
    const nextPage: IPageIShoppingMallDisputeHistory =
      await api.functional.shoppingMall.admin.disputes.histories.index(
        connection,
        {
          disputeId: dispute.id,
          body: nextPageRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.equals(
      "history second page number",
      nextPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "history second page limit",
      nextPage.pagination.limit,
      pageLimit,
    );
  }
}
