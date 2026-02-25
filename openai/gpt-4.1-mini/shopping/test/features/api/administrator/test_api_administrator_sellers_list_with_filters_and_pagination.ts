import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sellers_list_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Test scenario 1: Get sellers list with filters and pagination
  {
    const requestBody: IShoppingMallSeller.IRequest = {
      approval_status: "approved",
      suspension_status: false,
      keyword: RandomGenerator.substring("shop") + RandomGenerator.alphabets(3),
      page: 1,
      limit: 5,
    };
    const response =
      await api.functional.shoppingMall.administrator.sellers.index(
        adminConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page positive",
      response.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination limit positive",
      response.pagination.limit > 0,
    );
    // Validate each seller summary fields
    response.data.forEach((seller) => {
      typia.assert(seller.id);
      typia.assert(seller.email);
      typia.assert(seller.shopName);
      typia.assert(seller.approvalStatus);
      // Check rejectionReason exists (nullable)
      if (
        seller.rejectionReason !== null &&
        seller.rejectionReason !== undefined
      ) {
        typia.assert(seller.rejectionReason);
      }
      // Check approvalStatus matches request
      TestValidator.equals(
        "seller approval status",
        seller.approvalStatus,
        "approved",
      );
      // Check suspension_status (should be false, but property not existing in summary)
      // So not validated here
    });
  }
  // 3. Test scenario 2: No matching sellers
  {
    const requestBody: IShoppingMallSeller.IRequest = {
      approval_status: "rejected",
      rejection_reason: "non-existent-reason",
      page: 1,
      limit: 5,
    };
    const response =
      await api.functional.shoppingMall.administrator.sellers.index(
        adminConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Validate empty data array
    TestValidator.equals("empty data", response.data.length, 0);
    // Validate pagination metadata reflects zero records and pages
    TestValidator.equals(
      "pagination records zero",
      response.pagination.records,
      0,
    );
    TestValidator.equals("pagination pages zero", response.pagination.pages, 0);
    // Current page is 1 as requested
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      1,
    );
  }
  // 4. Test unauthorized access
  {
    const unauthorizedConn: api.IConnection = { host: connection.host };
    await TestValidator.httpError("unauthorized access", 401, async () => {
      await api.functional.shoppingMall.administrator.sellers.index(
        unauthorizedConn,
        {
          body: {
            approval_status: "approved",
            page: 1,
            limit: 5,
          },
        },
      );
    });
  }
}
