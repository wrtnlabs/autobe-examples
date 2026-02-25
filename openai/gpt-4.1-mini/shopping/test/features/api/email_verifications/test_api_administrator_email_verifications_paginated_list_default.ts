import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_email_verifications_paginated_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin#1234",
    },
  });
  typia.assert(adminAuthorized);
  // 2. Retrieve email verification records with default pagination and no filters
  const requestBody: IShoppingMallCustomerEmailVerification.IRequest = {};
  const response =
    await api.functional.shoppingMall.administrator.email_verifications.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Validate pagination info properties
  TestValidator.predicate(
    "pagination current page number is positive integer",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative integer",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative integer",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array item structure and presence
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  if (response.data.length > 0) {
    response.data.forEach((item) => {
      typia.assert(item);
      TestValidator.predicate(
        "each item has an id with UUID format",
        /^[0-9a-fA-F-]{36}$/.test(item.id),
      );
      TestValidator.predicate(
        "each item has a non-empty token string",
        typeof item.token === "string" && item.token.length > 0,
      );
      // expiresAt is ISO date-time string
      TestValidator.predicate(
        "each item has an expiresAt ISO date-time string",
        typeof item.expiresAt === "string" &&
          !isNaN(Date.parse(item.expiresAt)),
      );
      // verifiedAt is null or ISO date-time string
      TestValidator.predicate(
        "each item has verifiedAt as null or ISO date-time string",
        item.verifiedAt === null ||
          (typeof item.verifiedAt === "string" &&
            !isNaN(Date.parse(item.verifiedAt))),
      );
      // createdAt and updatedAt are ISO date-time strings
      TestValidator.predicate(
        "each item has createdAt as ISO date-time string",
        typeof item.createdAt === "string" &&
          !isNaN(Date.parse(item.createdAt)),
      );
      TestValidator.predicate(
        "each item has updatedAt as ISO date-time string",
        typeof item.updatedAt === "string" &&
          !isNaN(Date.parse(item.updatedAt)),
      );
      // deletedAt is null or ISO date-time string
      TestValidator.predicate(
        "each item has deletedAt as null or ISO date-time string",
        item.deletedAt === null ||
          (typeof item.deletedAt === "string" &&
            !isNaN(Date.parse(item.deletedAt))),
      );
      // customer object structure
      typia.assert(item.customer);
      TestValidator.predicate(
        "customer has uuid id",
        /^[0-9a-fA-F-]{36}$/.test(item.customer.id),
      );
      TestValidator.predicate(
        "customer email is non-empty string",
        typeof item.customer.email === "string" &&
          item.customer.email.length > 0,
      );
      // Optional displayName and phoneNumber may be null or string
      if (
        item.customer.displayName !== null &&
        item.customer.displayName !== undefined
      ) {
        TestValidator.predicate(
          "customer displayName is string",
          typeof item.customer.displayName === "string",
        );
      }
      if (
        item.customer.phoneNumber !== null &&
        item.customer.phoneNumber !== undefined
      ) {
        TestValidator.predicate(
          "customer phoneNumber is string",
          typeof item.customer.phoneNumber === "string",
        );
      }
      // createdAt and updatedAt of customer
      TestValidator.predicate(
        "customer createdAt is ISO date-time string",
        typeof item.customer.createdAt === "string" &&
          !isNaN(Date.parse(item.customer.createdAt)),
      );
      TestValidator.predicate(
        "customer updatedAt is ISO date-time string",
        typeof item.customer.updatedAt === "string" &&
          !isNaN(Date.parse(item.customer.updatedAt)),
      );
    });
  }
  // 5. Unauthorized access test: use base connection without auth headers
  await TestValidator.httpError("reject unauthorized access", 401, async () => {
    await api.functional.shoppingMall.administrator.email_verifications.index(
      connection,
      { body: requestBody },
    );
  });
}
