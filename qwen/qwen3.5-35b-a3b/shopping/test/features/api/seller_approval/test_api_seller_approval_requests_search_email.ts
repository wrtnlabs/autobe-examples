import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_seller_approval_requests_search_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create multiple sellers with different email addresses
  const seller1Email = "seller1@example.com";
  const seller2Email = "seller2@example.com";
  const testSellerEmail = "test-seller@example.com";
  // Create seller 1
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: "TestPassword123!",
      display_name: "Seller One",
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/",
      ip: "192.168.1.1",
    },
  });
  typia.assert(seller1Auth);
  // Create seller 2
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: "TestPassword123!",
      display_name: "Seller Two",
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/",
      ip: "192.168.1.2",
    },
  });
  typia.assert(seller2Auth);
  // Create test seller
  const testSellerConnection: api.IConnection = { host: connection.host };
  const testSellerAuth = await authorize_seller_join(testSellerConnection, {
    body: {
      email: testSellerEmail,
      password: "TestPassword123!",
      display_name: "Test Seller",
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/",
      ip: "192.168.1.3",
    },
  });
  typia.assert(testSellerAuth);
  // Step 2: Each seller creates an approval request
  const approvalRequest1 =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      seller1Connection,
      {
        body: {
          request_reason: "I want to sell handmade crafts on your platform",
        },
      },
    );
  typia.assert(approvalRequest1);
  const approvalRequest2 =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      seller2Connection,
      {
        body: {
          request_reason: "I specialize in organic food products",
        },
      },
    );
  typia.assert(approvalRequest2);
  const testApprovalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      testSellerConnection,
      {
        body: {
          request_reason: "I want to join as a technology gadget seller",
        },
      },
    );
  typia.assert(testApprovalRequest);
  // Step 3: Search with partial email match - search for 'seller1'
  const searchConnection1: api.IConnection = { host: connection.host };
  const searchResult1 =
    await api.functional.ecommerceMall.seller.seller_approvals.index(
      searchConnection1,
      {
        body: {
          search: "seller1",
          page: 0,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult1);
  // Verify search results contain seller1's approval request
  TestValidator.equals(
    "seller1 approval request found",
    searchResult1.data.some(
      (req) =>
        req.seller.email === seller1Email ||
        req.seller.display_name === "Seller One",
    ),
    true,
  );
  TestValidator.equals(
    "seller1 request status",
    searchResult1.data[0]?.status,
    "pending",
  );
  // Step 4: Search with partial email match - search for 'seller2'
  const searchConnection2: api.IConnection = { host: connection.host };
  const searchResult2 =
    await api.functional.ecommerceMall.seller.seller_approvals.index(
      searchConnection2,
      {
        body: {
          search: "seller2",
          page: 0,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "seller2 approval request found",
    searchResult2.data.some(
      (req) =>
        req.seller.email === seller2Email ||
        req.seller.display_name === "Seller Two",
    ),
    true,
  );
  TestValidator.equals(
    "seller2 request status",
    searchResult2.data[0]?.status,
    "pending",
  );
  // Step 5: Search with 'test' to match test-seller@example.com
  const searchConnection3: api.IConnection = { host: connection.host };
  const searchResult3 =
    await api.functional.ecommerceMall.seller.seller_approvals.index(
      searchConnection3,
      {
        body: {
          search: "test",
          page: 0,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "test seller approval request found",
    searchResult3.data.some((req) => req.seller.email === testSellerEmail),
    true,
  );
  // Step 6: Search with no matching results
  const searchConnection4: api.IConnection = { host: connection.host };
  const searchResult4 =
    await api.functional.ecommerceMall.seller.seller_approvals.index(
      searchConnection4,
      {
        body: {
          search: "nonexistentemail",
          page: 0,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals("no matching results", searchResult4.data.length, 0);
  TestValidator.equals(
    "pagination records",
    searchResult4.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", searchResult4.pagination.pages, 0);
  // Step 7: Combined filters - status + search
  const searchConnection5: api.IConnection = { host: connection.host };
  const searchResult5 =
    await api.functional.ecommerceMall.seller.seller_approvals.index(
      searchConnection5,
      {
        body: {
          search: "seller1",
          status: ["pending"],
          page: 0,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult5);
  TestValidator.equals(
    "combined filter returns seller1",
    searchResult5.data.some(
      (req) => req.seller.email === seller1Email && req.status === "pending",
    ),
    true,
  );
  // Step 8: Verify pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult1.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    searchResult1.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    searchResult1.pagination.pages,
    1,
  );
  // Step 9: Verify results are sorted by created_at descending (newest first)
  if (searchResult1.data.length >= 2) {
    const firstCreatedAt = new Date(searchResult1.data[0].created_at).getTime();
    const secondCreatedAt = new Date(
      searchResult1.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "results sorted by created_at desc",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // Step 10: Verify response schema with all required fields
  for (const req of searchResult1.data) {
    typia.assert(req);
    TestValidator.notEquals("approval request id present", req.id, undefined);
    TestValidator.notEquals(
      "approval request status present",
      req.status,
      undefined,
    );
    TestValidator.notEquals("seller object present", req.seller, undefined);
    TestValidator.notEquals("created_at present", req.created_at, undefined);
    TestValidator.notEquals("updated_at present", req.updated_at, undefined);
    TestValidator.notEquals(
      "seller email present",
      req.seller.email,
      undefined,
    );
    TestValidator.notEquals(
      "seller display_name present",
      req.seller.display_name,
      undefined,
    );
  }
}
