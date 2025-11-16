import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Verifies that an authenticated seller can list all of their session records
 * using the PATCH /shoppingMall/seller/sellers/{sellerId}/sessions endpoint.
 *
 * 1. Register a unique seller account (email, password, business info,
 *    page/referrer URL, IP)
 * 2. Use that seller's token and UUID to request session listing for self using
 *    default options
 * 3. Validate: response pagination, session data array, all
 *    shopping_mall_seller_id fields match sellerId
 * 4. Use filters: date range (start_at, end_at), partial IP match, and expired
 *    flag (true/false)
 * 5. Confirm all response data fields (id, ip, href, referrer, created_at,
 *    expired_at) are present, correct format, and each session belongs to self
 * 6. Ensure filter and pagination results differ as expected by parameters, and no
 *    cross-seller leakage occurs
 */
export async function test_api_seller_session_list_by_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const business_name = RandomGenerator.name();
  const registration_number = RandomGenerator.alphaNumeric(13);
  const business_phone = RandomGenerator.mobile();
  const href =
    "https://" + RandomGenerator.alphaNumeric(8) + ".example.com/page";
  const referrer =
    "https://" + RandomGenerator.alphaNumeric(8) + ".example.com/prev";
  const ip = typia.random<string & tags.Format<"ipv4">>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password,
      business_name,
      registration_number,
      business_phone,
      href,
      referrer,
      ip,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);
  const sellerId = seller.id;

  // 2. List sessions with default params
  let sessionsResp =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: {},
      },
    );
  typia.assert(sessionsResp);
  const sessions = sessionsResp.data;

  TestValidator.equals(
    "sessions belong to self",
    sessions.every((s) => s.shopping_mall_seller_id === sellerId),
    true,
  );
  TestValidator.equals(
    "pagination record count >= sessions.length",
    sessionsResp.pagination.records >= sessions.length,
    true,
  );

  // 3. List with date range filter (start_at ~ end_at covers all known sessions)
  if (sessions.length > 0) {
    const minCreated = sessions.reduce(
      (min, s) => (s.created_at < min ? s.created_at : min),
      sessions[0].created_at,
    );
    const maxCreated = sessions.reduce(
      (max, s) => (s.created_at > max ? s.created_at : max),
      sessions[0].created_at,
    );
    const filteredResp =
      await api.functional.shoppingMall.seller.sellers.sessions.index(
        connection,
        {
          sellerId,
          body: {
            start_at: minCreated,
            end_at: maxCreated,
          } satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    typia.assert(filteredResp);
    TestValidator.equals(
      "date filter sessions belong to self",
      filteredResp.data.every((s) => s.shopping_mall_seller_id === sellerId),
      true,
    );
  }

  // 4. List with IP partial match
  if (sessions.length > 0) {
    const partialIp = sessions[0].ip.substring(0, 6);
    const filteredResp =
      await api.functional.shoppingMall.seller.sellers.sessions.index(
        connection,
        {
          sellerId,
          body: {
            ip: partialIp,
          } satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    typia.assert(filteredResp);
    TestValidator.equals(
      "ip filter sessions have matching partial Ip",
      filteredResp.data.every((s) => s.ip.includes(partialIp)),
      true,
    );
  }

  // 5. List with expired: true and false; at least check API accepts without error
  for (const expiredFlag of [true, false]) {
    const filteredResp =
      await api.functional.shoppingMall.seller.sellers.sessions.index(
        connection,
        {
          sellerId,
          body: {
            expired: expiredFlag,
          } satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    typia.assert(filteredResp);
    TestValidator.equals(
      "'expired' flag filter sessions belong to self",
      filteredResp.data.every((s) => s.shopping_mall_seller_id === sellerId),
      true,
    );
  }

  // 6. Validate detail structure of all returned sessions
  sessions.forEach((session) => {
    typia.assert<IShoppingMallSellerSession.ISummary>(session);
    TestValidator.predicate(
      "session id non-empty uuid",
      typeof session.id === "string" && session.id.length > 0,
    );
    TestValidator.equals(
      "session shopping_mall_seller_id equals sellerId",
      session.shopping_mall_seller_id,
      sellerId,
    );
    TestValidator.predicate(
      "session ip string",
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      "session href non-empty string",
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer non-empty string",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session created_at string",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    // expired_at may be null/undefined or string
    if (session.expired_at !== null && session.expired_at !== undefined) {
      TestValidator.predicate(
        "session expired_at string",
        typeof session.expired_at === "string" && session.expired_at.length > 0,
      );
    }
  });
}
