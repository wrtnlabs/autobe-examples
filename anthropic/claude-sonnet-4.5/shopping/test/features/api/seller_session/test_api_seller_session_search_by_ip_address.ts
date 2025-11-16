import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test filtering seller sessions by IP address as admin.
 *
 * This test validates the IP address filtering functionality for seller
 * authentication sessions. It creates multiple seller accounts with different
 * IP addresses and tests that admin users can search for sessions filtering by
 * specific IP addresses. Only sessions with exact IP matches should be
 * returned.
 *
 * Test workflow:
 *
 * 1. Create first seller account with specific IP address (192.168.1.100)
 * 2. Create second seller account with different IP address (10.0.0.50)
 * 3. Create third seller account with another IP address (172.16.0.25)
 * 4. Authenticate as admin user to access session search functionality
 * 5. Search all sellers' sessions filtering by first IP address
 * 6. Validate that only sessions with exact IP match are returned
 * 7. Search filtering by second IP address and validate results
 * 8. Search filtering by non-existent IP address (should return empty)
 * 9. Verify that partial IP matching is NOT performed (exact match only)
 * 10. Confirm session summaries include accurate IP address information
 */
export async function test_api_seller_session_search_by_ip_address(
  connection: api.IConnection,
) {
  // Generate test IP addresses for different sessions
  const ipAddress1 = "192.168.1.100";
  const ipAddress2 = "10.0.0.50";
  const ipAddress3 = "172.16.0.25";
  const nonExistentIp = "203.0.113.99";

  // Step 1: Create first seller account with IP address 192.168.1.100
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: seller1Email,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        ip: ipAddress1,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller1);

  // Step 2: Create second seller account with IP address 10.0.0.50
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: seller2Email,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        ip: ipAddress2,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller2);

  // Step 3: Create third seller account with IP address 172.16.0.25
  const seller3Email = typia.random<string & tags.Format<"email">>();
  const seller3: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: seller3Email,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        ip: ipAddress3,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller3);

  // Step 4: Authenticate as admin user
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 5: Search seller1's sessions filtering by ipAddress1 (exact match)
  const seller1SessionsWithIp1: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller1.id,
      body: {
        ip: ipAddress1,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(seller1SessionsWithIp1);

  // Step 6: Validate that seller1's sessions with IP1 are found
  TestValidator.predicate(
    "seller1 sessions with IP 192.168.1.100 should be found",
    seller1SessionsWithIp1.data.length > 0,
  );

  // Validate that all returned sessions have the exact IP address
  seller1SessionsWithIp1.data.forEach((session) => {
    TestValidator.equals(
      "session IP should exactly match ipAddress1",
      session.ip,
      ipAddress1,
    );
  });

  // Step 7: Search seller2's sessions filtering by ipAddress2
  const seller2SessionsWithIp2: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller2.id,
      body: {
        ip: ipAddress2,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(seller2SessionsWithIp2);

  TestValidator.predicate(
    "seller2 sessions with IP 10.0.0.50 should be found",
    seller2SessionsWithIp2.data.length > 0,
  );

  seller2SessionsWithIp2.data.forEach((session) => {
    TestValidator.equals(
      "session IP should exactly match ipAddress2",
      session.ip,
      ipAddress2,
    );
  });

  // Step 8: Verify that searching seller1 with seller2's IP returns no results
  const seller1SessionsWithIp2: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller1.id,
      body: {
        ip: ipAddress2,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(seller1SessionsWithIp2);

  TestValidator.equals(
    "seller1 should have no sessions with seller2's IP",
    seller1SessionsWithIp2.data.length,
    0,
  );

  // Step 9: Search sessions filtering by non-existent IP address
  const sessionsWithNonExistentIp: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller1.id,
      body: {
        ip: nonExistentIp,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(sessionsWithNonExistentIp);

  TestValidator.equals(
    "no sessions should be found for non-existent IP",
    sessionsWithNonExistentIp.data.length,
    0,
  );

  // Step 10: Verify that partial IP matching does NOT work (exact match only)
  const partialIpSearch: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller1.id,
      body: {
        ip: "192.168",
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(partialIpSearch);

  TestValidator.equals(
    "partial IP matching should not return results",
    partialIpSearch.data.length,
    0,
  );

  // Step 11: Retrieve all sessions for seller1 without IP filter
  const allSeller1Sessions: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: seller1.id,
      body: {} satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(allSeller1Sessions);

  // Verify that session summaries include accurate IP information
  allSeller1Sessions.data.forEach((session) => {
    TestValidator.predicate(
      "session should have valid IP address",
      session.ip !== null && session.ip !== undefined && session.ip.length > 0,
    );
  });

  // Verify that at least one session has ipAddress1
  const hasIpAddress1 = allSeller1Sessions.data.some(
    (session) => session.ip === ipAddress1,
  );
  TestValidator.predicate(
    "seller1 sessions should contain at least one with ipAddress1",
    hasIpAddress1,
  );
}
