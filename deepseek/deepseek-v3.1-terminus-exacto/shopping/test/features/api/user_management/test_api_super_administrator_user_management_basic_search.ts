import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test basic user search functionality by creating multiple user types (customer, seller, administrator, super administrator)
 * and searching across all of them.
 */
export async function test_api_super_administrator_user_management_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create users of each type
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(administrator);
  // Create super administrator and authenticate with it
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // Note: authorize_super_administrator_join already sets authorization header
  // Create a fresh connection for super administrator to use for search
  const searchConnection: api.IConnection = { host: connection.host };
  searchConnection.headers = { Authorization: superAdmin.token.access };
  // Perform basic search without filters
  const searchResult =
    await api.functional.ecommerce.superAdministrator.user_management.index(
      searchConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "total records should include all created users",
    searchResult.pagination.records >= 4,
  );
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pages should be calculated correctly",
    searchResult.pagination.pages >= 1,
  );
  // Validate data structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(searchResult.data),
  );
  // Validate that summaries contain appropriate fields
  for (const summary of searchResult.data) {
    typia.assert(summary);
    // administrator and superAdministrator can be null in IEcommerceMetadataRegistryRelationship.ISummary
    // This is defined in the DTO definitions
    TestValidator.predicate(
      "summary has valid id",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary has action_type",
      typeof summary.action_type === "string" && summary.action_type.length > 0,
    );
    TestValidator.predicate(
      "summary has general_description",
      typeof summary.general_description === "string",
    );
    TestValidator.predicate(
      "summary has created_at",
      typeof summary.created_at === "string" && summary.created_at.length > 0,
    );
  }
}
