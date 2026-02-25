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

export async function test_api_administrator_email_verifications_filter_verified_status_and_customer(
  connection: api.IConnection,
): Promise<void> {
  // Administrator joins and gets authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Authorization token added internally in adminConnection by utility function
  // Create filtering test data: create multiple email verification records
  // We simulate this by using the API to fetch records, but due to the scenario
  // plan, we focus on filtering and validation only.
  // Fetch all records without filter for control comparison
  const allRecords =
    await api.functional.shoppingMall.administrator.email_verifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(allRecords);
  // If no records, we cannot proceed testing filtering by customerId
  // To simulate, we pick a customerId from existing records if any
  // Extract a customerId from first record if available
  const exampleCustomerId: (string & tags.Format<"uuid">) | undefined =
    allRecords.data.length > 0 ? allRecords.data[0].customer.id : undefined;
  // Test filtering by verified status = true
  const verifiedFiltered =
    await api.functional.shoppingMall.administrator.email_verifications.index(
      adminConnection,
      {
        body: {
          verified: true,
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(verifiedFiltered);
  // Assert all response data entries have verifiedAt not null
  for (const item of verifiedFiltered.data) {
    TestValidator.predicate(
      "verified filter correctness",
      item.verifiedAt !== null && typeof item.verifiedAt === "string",
    );
  }
  // Test filtering by verified status = false
  const unverifiedFiltered =
    await api.functional.shoppingMall.administrator.email_verifications.index(
      adminConnection,
      {
        body: {
          verified: false,
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(unverifiedFiltered);
  // Assert all response data entries have verifiedAt null
  for (const item of unverifiedFiltered.data) {
    TestValidator.predicate(
      "unverified filter correctness",
      item.verifiedAt === null,
    );
  }
  if (exampleCustomerId !== undefined) {
    // Test filtering by specific customerId
    const customerFiltered =
      await api.functional.shoppingMall.administrator.email_verifications.index(
        adminConnection,
        {
          body: {
            shoppingMallCustomerId: exampleCustomerId,
            page: 1,
            limit: 50,
          },
        },
      );
    typia.assert(customerFiltered);
    // Assert all returned data have the same customer id
    for (const item of customerFiltered.data) {
      TestValidator.equals(
        "customer id filter correctness",
        item.customer.id,
        exampleCustomerId,
      );
    }
  }
  // Test combined filtering verified: true and customer id, only if exampleCustomerId is defined
  if (exampleCustomerId !== undefined) {
    const combinedVerifiedCustomerFiltered =
      await api.functional.shoppingMall.administrator.email_verifications.index(
        adminConnection,
        {
          body: {
            verified: true,
            shoppingMallCustomerId: exampleCustomerId,
            page: 1,
            limit: 50,
          },
        },
      );
    typia.assert(combinedVerifiedCustomerFiltered);
    for (const item of combinedVerifiedCustomerFiltered.data) {
      TestValidator.equals(
        "combined filter customerId correctness",
        item.customer.id,
        exampleCustomerId,
      );
      TestValidator.predicate(
        "combined filter verified status true",
        item.verifiedAt !== null,
      );
    }
  }
  // Test combined filtering verified: false and customer id, only if exampleCustomerId is defined
  if (exampleCustomerId !== undefined) {
    const combinedUnverifiedCustomerFiltered =
      await api.functional.shoppingMall.administrator.email_verifications.index(
        adminConnection,
        {
          body: {
            verified: false,
            shoppingMallCustomerId: exampleCustomerId,
            page: 1,
            limit: 50,
          },
        },
      );
    typia.assert(combinedUnverifiedCustomerFiltered);
    for (const item of combinedUnverifiedCustomerFiltered.data) {
      TestValidator.equals(
        "combined filter customerId correctness",
        item.customer.id,
        exampleCustomerId,
      );
      TestValidator.predicate(
        "combined filter verified status false",
        item.verifiedAt === null,
      );
    }
  }
  // Test authorization enforcement: try accessing with no authorization
  // Make a new connection without authorization headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access forbidden",
    401,
    async () =>
      await api.functional.shoppingMall.administrator.email_verifications.index(
        unauthorizedConnection,
        {
          body: {
            page: 1,
            limit: 10,
          },
        },
      ),
  );
}
