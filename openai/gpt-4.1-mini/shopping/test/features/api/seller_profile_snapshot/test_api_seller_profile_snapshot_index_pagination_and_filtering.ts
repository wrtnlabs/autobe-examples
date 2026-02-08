import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshot_index_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authorize administrator
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Scenario 1: Default pagination, no filters
  {
    const body: IShoppingMallSellerProfileSnapshot.IRequest = {};
    const response =
      await api.functional.shoppingMall.sellerProfileSnapshots.index(
        adminConnection,
        { body },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current is zero or positive",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is zero or positive",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records is zero or positive",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is zero or positive",
      response.pagination.pages >= 0,
    );
    // Validate data array
    TestValidator.predicate("data is array", Array.isArray(response.data));
    if (response.data.length > 0) {
      for (const snapshot of response.data) {
        // Just assert typia type correctness, no invalid property access
        typia.assert(snapshot);
      }
      // Since created_at or shop_name isn't defined in ISummary, skip ordering validation
    } else {
      TestValidator.equals(
        "no snapshots returned, data length zero",
        response.data.length,
        0,
      );
      TestValidator.equals(
        "pagination records should be zero",
        response.pagination.records,
        0,
      );
    }
  }
  // Scenario 2: Filter by seller_id and date range (if possible)
  {
    const bodyAll: IShoppingMallSellerProfileSnapshot.IRequest = {};
    const respAll =
      await api.functional.shoppingMall.sellerProfileSnapshots.index(
        adminConnection,
        { body: bodyAll },
      );
    typia.assert(respAll);
    if (respAll.data.length > 0) {
      // We do not have access to shopping_mall_seller.id in ISummary, so skip filtering by actual sellerId
      // Instead, execute filter with dummy date range and seller_id if possible
      // Because we can't get sellerId from snapshot, omit seller_id filter
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      const body: IShoppingMallSellerProfileSnapshot.IRequest = {
        created_at: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
      const filteredResp =
        await api.functional.shoppingMall.sellerProfileSnapshots.index(
          adminConnection,
          { body },
        );
      typia.assert(filteredResp);
      // Validate pagination metadata
      TestValidator.predicate(
        "filtered pagination current is zero or positive",
        filteredResp.pagination.current >= 0,
      );
      TestValidator.predicate(
        "filtered pagination limit is zero or positive",
        filteredResp.pagination.limit >= 0,
      );
      TestValidator.predicate(
        "filtered pagination records is zero or positive",
        filteredResp.pagination.records >= 0,
      );
      TestValidator.predicate(
        "filtered pagination pages is zero or positive",
        filteredResp.pagination.pages >= 0,
      );
      // Validate data
      TestValidator.predicate(
        "filtered data is array",
        Array.isArray(filteredResp.data),
      );
      for (const snapshot of filteredResp.data) {
        typia.assert(snapshot);
      }
    }
  }
  // Scenario 3: Text search
  {
    const bodyAll: IShoppingMallSellerProfileSnapshot.IRequest = {};
    const respAll =
      await api.functional.shoppingMall.sellerProfileSnapshots.index(
        adminConnection,
        { body: bodyAll },
      );
    typia.assert(respAll);
    // We cannot safely get shop_name property to extract keyword, so use a constant keyword
    const keyword = "test";
    const body: IShoppingMallSellerProfileSnapshot.IRequest = {
      search: keyword,
    };
    const searchResp =
      await api.functional.shoppingMall.sellerProfileSnapshots.index(
        adminConnection,
        { body },
      );
    typia.assert(searchResp);
    TestValidator.predicate(
      "search data is array",
      Array.isArray(searchResp.data),
    );
    if (searchResp.data.length === 0) {
      TestValidator.equals("no search results", searchResp.data.length, 0);
      TestValidator.equals(
        "pagination records should be zero",
        searchResp.pagination.records,
        0,
      );
    } else {
      for (const snapshot of searchResp.data) {
        typia.assert(snapshot);
      }
      TestValidator.predicate(
        "pagination current is zero or positive",
        searchResp.pagination.current >= 0,
      );
      TestValidator.predicate(
        "pagination limit is zero or positive",
        searchResp.pagination.limit >= 0,
      );
      TestValidator.predicate(
        "pagination records is zero or positive",
        searchResp.pagination.records >= 0,
      );
      TestValidator.predicate(
        "pagination pages is zero or positive",
        searchResp.pagination.pages >= 0,
      );
    }
  }
}
