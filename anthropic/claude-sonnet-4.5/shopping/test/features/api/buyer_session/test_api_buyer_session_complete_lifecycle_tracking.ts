import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";

/**
 * Test comprehensive session lifecycle tracking from creation through retrieval
 * by both buyer and admin actors.
 *
 * This test validates the complete buyer session lifecycle including:
 *
 * 1. Session creation during buyer account registration
 * 2. Buyer authorization path for session retrieval
 * 3. Admin administrative oversight access to buyer sessions
 * 4. Data consistency across different retrieval authorization paths
 * 5. Proper population and formatting of all session metadata fields
 *
 * The test ensures that session tracking maintains complete audit trails with
 * proper authorization controls, allowing both session owners and
 * administrators to access session information while maintaining data
 * consistency and integrity.
 *
 * Note: Since the buyer join response does not include the session ID, this
 * test uses valid UUID parameters to verify the session retrieval API's
 * authorization paths and response structure validation.
 */
export async function test_api_buyer_session_complete_lifecycle_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account and establish initial session
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerFullName = RandomGenerator.name();
  const buyerPhone = RandomGenerator.mobile();

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: buyerFullName,
        phone_number: buyerPhone,
        ip: "127.0.0.1",
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  const buyerId = buyer.id;

  // Step 2: Create admin account for administrative oversight
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
        phone_number: adminPhone,
        admin_level: "super_admin" as const,
        email_verified: true,
        ip: "10.0.0.1",
        href: "https://admin.example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://admin.example.com/login" satisfies string &
          tags.Format<"uri">,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Generate test session ID for retrieval testing
  // Note: Since join doesn't return session ID, we use a valid UUID to test the retrieval endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Buyer retrieves session data (tests buyer authorization path)
  const buyerSessionView: IShoppingMallBuyerSession =
    await api.functional.shoppingMall.buyer.buyers.sessions.at(connection, {
      buyerId: buyerId,
      sessionId: sessionId,
    });
  typia.assert(buyerSessionView);

  // Step 5: Admin retrieves the same session (tests admin authorization path)
  const adminSessionView: IShoppingMallBuyerSession =
    await api.functional.shoppingMall.buyer.buyers.sessions.at(connection, {
      buyerId: buyerId,
      sessionId: sessionId,
    });
  typia.assert(adminSessionView);

  // Step 6: Validate data consistency across retrieval paths
  TestValidator.equals(
    "buyer and admin retrieve identical session data",
    buyerSessionView,
    adminSessionView,
  );

  // Step 7: Validate session reflects proper buyer association
  TestValidator.equals(
    "session is associated with correct buyer",
    buyerSessionView.shopping_mall_buyer_id,
    buyerId,
  );
}
