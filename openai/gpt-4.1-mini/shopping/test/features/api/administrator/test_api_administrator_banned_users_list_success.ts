import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBannedUser";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join (register) and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Call the banned users list API with empty filter (no filters)
  const response: IPageIShoppingMallBannedUser.ISummary =
    await api.functional.shoppingMall.administrator.bannedUsers.index(
      adminConnection,
      {
        body: {}, // No filters - retrieve all banned users
      },
    );
  // 3. Assert the response structure
  typia.assert(response);
  // 4. Assert valid pagination
  TestValidator.predicate(
    "pagination current page is >= 1",
    () => response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 1",
    () => response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    () => response.pagination.pages >= 0,
  );
  // 5. Assert each banned user summary in data
  for (const item of response.data) {
    // Assert common fields
    typia.assert(item);
    TestValidator.predicate(
      "banReason is non-empty string",
      item.banReason.length > 0,
    );
    TestValidator.predicate(
      "createdAt is ISO datetime",
      () => !isNaN(Date.parse(item.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is ISO datetime",
      () => !isNaN(Date.parse(item.updatedAt)),
    );
    // deletedAt can be null
    if (item.deletedAt !== undefined && item.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt is ISO datetime or null",
        () => !isNaN(Date.parse(item.deletedAt ?? "")),
      );
    }
    // If customer is present, assert it
    if (item.customer !== null && item.customer !== undefined) {
      typia.assert(item.customer);
      TestValidator.predicate(
        "customer id is uuid",
        item.customer.id.length === 36,
      );
      TestValidator.predicate(
        "customer email is non-empty",
        item.customer.email.length > 0,
      );
      if (
        item.customer.displayName !== undefined &&
        item.customer.displayName !== null
      ) {
        TestValidator.predicate(
          "customer displayName is string",
          typeof item.customer.displayName === "string",
        );
      }
      if (
        item.customer.phoneNumber !== undefined &&
        item.customer.phoneNumber !== null
      ) {
        TestValidator.predicate(
          "customer phoneNumber is string",
          typeof item.customer.phoneNumber === "string",
        );
      }
      // Added explicit non-null assertion to prevent possible null
      TestValidator.predicate(
        "customer createdAt is ISO datetime",
        () => !isNaN(Date.parse(item.customer!.createdAt)),
      );
      TestValidator.predicate(
        "customer updatedAt is ISO datetime",
        () => !isNaN(Date.parse(item.customer!.updatedAt)),
      );
    }
    // If seller is present, assert it
    if (item.seller !== null && item.seller !== undefined) {
      typia.assert(item.seller);
      TestValidator.predicate(
        "seller id is uuid",
        item.seller.id.length === 36,
      );
      TestValidator.predicate(
        "seller email is non-empty",
        item.seller.email.length > 0,
      );
      TestValidator.predicate(
        "seller shopName is non-empty",
        item.seller.shopName.length > 0,
      );
      if (
        item.seller.shopDescription !== undefined &&
        item.seller.shopDescription !== null
      ) {
        TestValidator.predicate(
          "seller shopDescription is string",
          typeof item.seller.shopDescription === "string",
        );
      }
      if (item.seller.logoUri !== undefined && item.seller.logoUri !== null) {
        TestValidator.predicate(
          "seller logoUri is string",
          typeof item.seller.logoUri === "string",
        );
      }
      TestValidator.predicate(
        "seller approvalStatus is non-empty string",
        item.seller.approvalStatus.length > 0,
      );
      if (
        item.seller.rejectionReason !== undefined &&
        item.seller.rejectionReason !== null
      ) {
        TestValidator.predicate(
          "seller rejectionReason is string",
          typeof item.seller.rejectionReason === "string",
        );
      }
    }
  }
}
