import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_search_pagination_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Retrieve paginated and filtered lists of sellers using various filters
  // including approval_status, suspension_status, created_at range, rejection_reason keyword, and keyword search in shopName or shopDescription.
  // Must confirm valid pagination, response structure, and authorization as seller admin.
  // Setup a new seller account with random data and join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // Prepare various sellers with different approvalStatus, suspensionStatus, createdAt, rejectionReason, and shopName or shopDescription
  // Because we cannot create sellers via API here, assume at least one seller will exist with known values from join above for positive tests
  // Compose a list of filter test cases
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days ahead
  // Test pagination and limit validation with no filters (defaults)
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "page current at least 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "limit not exceed 10",
      response.pagination.limit <= 10,
    );
    TestValidator.predicate(
      "pages non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "records non-negative",
      response.pagination.records >= 0,
    );
    for (const seller of response.data) {
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test filtering by approval_status = "pending"
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          approval_status: "pending",
          page: 1,
          limit: 20,
        },
      },
    );
    typia.assert(response);
    for (const seller of response.data) {
      TestValidator.equals(
        "approval_status must be pending",
        seller.approvalStatus,
        "pending",
      );
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test filtering by approval_status = "approved"
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          approval_status: "approved",
          page: 1,
          limit: 15,
        },
      },
    );
    typia.assert(response);
    for (const seller of response.data) {
      TestValidator.equals(
        "approval_status must be approved",
        seller.approvalStatus,
        "approved",
      );
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test filtering by approval_status = "rejected"
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          approval_status: "rejected",
          page: 1,
          limit: 10,
        },
      },
    );
    typia.assert(response);
    for (const seller of response.data) {
      TestValidator.equals(
        "approval_status must be rejected",
        seller.approvalStatus,
        "rejected",
      );
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test filtering by suspension_status true (suspended)
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          suspension_status: true,
          page: 1,
          limit: 5,
        },
      },
    );
    typia.assert(response);
    // Feeebdback: We do not have suspension status in ISummary, so cannot verify directly - just check structure
    for (const seller of response.data) {
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test filtering by suspension_status false (not suspended)
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          suspension_status: false,
          page: 1,
          limit: 5,
        },
      },
    );
    typia.assert(response);
    // Feeebdback: Cannot verify suspension status as above.
    for (const seller of response.data) {
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test filtering by created_at_gte and created_at_lte
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          created_at_gte: pastDate.toISOString(),
          created_at_lte: now.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
    typia.assert(response);
    for (const seller of response.data) {
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test filtering by rejection_reason keyword
  {
    const rejectionSearch = "invalid";
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          rejection_reason: rejectionSearch,
          page: 1,
          limit: 10,
        },
      },
    );
    typia.assert(response);
    // Sellers must have rejectionReason property matching or null
    for (const seller of response.data) {
      if (
        seller.rejectionReason !== null &&
        seller.rejectionReason !== undefined
      ) {
        TestValidator.predicate(
          "rejection_reason keyword",
          seller.rejectionReason.includes(rejectionSearch),
        );
      }
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test filtering by keyword in shopName or shopDescription
  {
    const keyword = sellerAuth.shopName.slice(0, 3); // partial of our own shop name
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          keyword: keyword,
          page: 1,
          limit: 20,
        },
      },
    );
    typia.assert(response);
    for (const seller of response.data) {
      TestValidator.predicate(
        "keyword matches in shopName or shopDescription",
        seller.shopName.includes(keyword) ||
          (seller.shopDescription ?? "").includes(keyword),
      );
      typia.assert<IShoppingMallSeller.ISummary>(seller);
    }
  }
  // Test empty result when page exceeds total pages
  {
    const response = await api.functional.shoppingMall.seller.sellers.index(
      sellerConnection,
      {
        body: {
          page: 9999,
          limit: 20,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals("empty result on high page", response.data.length, 0);
    TestValidator.predicate(
      "page current is 9999",
      response.pagination.current === 9999,
    );
  }
}
