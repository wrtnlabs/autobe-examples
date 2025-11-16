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
 * Test end-to-end seller dispute message retrieval scenario with filtering,
 * pagination, and multi-actor setup.
 *
 * 1. Register an admin (creates platform context).
 * 2. Log in as admin to get admin credentials.
 * 3. Register a seller and log in as seller actor (different account from admin).
 * 4. Admin creates a dispute referencing the new seller.
 * 5. Log in again as seller (context switch).
 * 6. Seller calls /shoppingMall/seller/disputes/{disputeId}/messages for the new
 *    dispute.
 * 7. Apply basic filter: fetch all messages with default pagination (page 1, limit
 *    10).
 * 8. Apply sender/receiver role/content filters (if possible) and use
 *    sort_by/order.
 * 9. Validate that only relevant dispute messages are returned (dispute linkage,
 *    correct actors/roles). Pagination is correct, and all returned messages
 *    are for the seller's dispute.
 * 10. Test that unrelated sellers cannot retrieve messages from this dispute
 *     (attempt to use a different seller and expect no/empty result or error).
 */
export async function test_api_seller_dispute_messages_search_by_seller_new_dispute(
  connection: api.IConnection,
) {
  // Step 1: Register platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10) + "!Aa1"; // ensures complexity
  const adminName = RandomGenerator.name();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // Step 2: Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 3: Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12) + "#Zz3";
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(2),
      registration_number: RandomGenerator.alphaNumeric(8),
      business_phone: RandomGenerator.mobile(),
      href: "https://mall.example.com/join",
      referrer: "https://mall.example.com/signup",
      ip: null, // optional, safe to use null
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerAuthorized);

  // Step 4: Seller login to ensure session is fresh (for dispute linkage)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://mall.example.com/login",
      referrer: "https://mall.example.com/",
      ip: null,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Admin login again to create dispute in admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // --- Prepare customer for the dispute ---
  // The customer ISummary is required by IShoppingMallDispute.ICreate input. We'll randomize it as context is not provided here.
  // In production test, this could be created via a customer registration API, but only summary fields are needed for IDs.
  const customerSummary: IShoppingMallCustomer.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
  };

  // Admin creates a new dispute linked to random customer and the new seller
  const dispute = await api.functional.shoppingMall.admin.disputes.create(
    connection,
    {
      body: {
        shopping_mall_refund_request_id: null, // Not linked to refund directly for generic case
        shopping_mall_customer_id: customerSummary.id,
        shopping_mall_seller_id: sellerAuthorized.id,
        shopping_mall_admin_id: null,
        status: "open",
        subject: RandomGenerator.paragraph({ sentences: 3 }),
        root_cause: RandomGenerator.paragraph({ sentences: 4 }),
        resolution_note: null,
      } satisfies IShoppingMallDispute.ICreate,
    },
  );
  typia.assert(dispute);

  // Step 6: Seller login for message search
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://mall.example.com/login",
      referrer: "https://mall.example.com/",
      ip: null,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 7: Seller requests messages for the dispute with default pagination
  const messagePage1 =
    await api.functional.shoppingMall.seller.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(messagePage1);
  TestValidator.equals(
    "pagination - current page is 1",
    messagePage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - page size is 10",
    messagePage1.pagination.limit,
    10,
  );
  // Validate all messages are for the correct dispute and to this seller
  for (const msg of messagePage1.data) {
    typia.assert(msg);
    TestValidator.equals("disputeId linkage", msg.dispute.id, dispute.id);
    TestValidator.equals(
      "seller in dispute linkage",
      msg.dispute.seller.id,
      sellerAuthorized.id,
    );
  }

  // Step 8: Try various filters (role/content/date range)
  const filterRole =
    await api.functional.shoppingMall.seller.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          role: "seller",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filterRole);
  for (const msg of filterRole.data) {
    TestValidator.equals("role filtered to seller", msg.role, "seller");
  }

  const contentKeyword =
    messagePage1.data.length > 0
      ? RandomGenerator.substring(messagePage1.data[0].content)
      : RandomGenerator.paragraph();
  const filterContent =
    await api.functional.shoppingMall.seller.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          content_contains: contentKeyword,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filterContent);
  // If there are results, the content contains our substring
  for (const msg of filterContent.data) {
    TestValidator.predicate(
      "content contains keyword",
      msg.content.includes(contentKeyword),
    );
  }

  // Step 9: Date range filter using created_at from page 1 if available
  if (messagePage1.data.length > 0) {
    const dateFrom = messagePage1.data[0].created_at;
    const dateTo = messagePage1.data[messagePage1.data.length - 1].created_at;
    const dateRangePage =
      await api.functional.shoppingMall.seller.disputes.messages.index(
        connection,
        {
          disputeId: dispute.id,
          body: {
            created_at_from: dateFrom,
            created_at_to: dateTo,
            page: 1,
            limit: 10,
          },
        },
      );
    typia.assert(dateRangePage);
    for (const msg of dateRangePage.data) {
      TestValidator.predicate(
        "created_at in range",
        msg.created_at >= dateFrom && msg.created_at <= dateTo,
      );
    }
  }

  // Step 10: Sort order test (desc/asc by created_at)
  const sortDesc =
    await api.functional.shoppingMall.seller.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(sortDesc);
  // If multiple messages, ensure descending order
  if (sortDesc.data.length > 1) {
    for (let i = 1; i < sortDesc.data.length; ++i) {
      TestValidator.predicate(
        "descending created_at order",
        sortDesc.data[i - 1].created_at >= sortDesc.data[i].created_at,
      );
    }
  }

  // Step 11: Unauthorized seller cannot access
  // Register a second seller
  const anotherSellerEmail = typia.random<string & tags.Format<"email">>();
  const anotherSellerPassword = RandomGenerator.alphaNumeric(14) + "$zz4";
  await api.functional.auth.seller.join(connection, {
    body: {
      email: anotherSellerEmail,
      password: anotherSellerPassword,
      business_name: RandomGenerator.name(2),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://mall.example.com/join2",
      referrer: "https://mall.example.com/signup2",
      ip: null,
    } satisfies IShoppingMallSeller.ICreate,
  });
  await api.functional.auth.seller.login(connection, {
    body: {
      email: anotherSellerEmail,
      password: anotherSellerPassword,
      href: "https://mall.example.com/login2",
      referrer: "https://mall.example.com/",
      ip: null,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Attempt to get dispute messages using unrelated seller
  const unauthorizedPage =
    await api.functional.shoppingMall.seller.disputes.messages.index(
      connection,
      {
        disputeId: dispute.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(unauthorizedPage);
  TestValidator.equals(
    "unauthorized seller gets no data to unrelated dispute",
    unauthorizedPage.data.length,
    0,
  );
}
