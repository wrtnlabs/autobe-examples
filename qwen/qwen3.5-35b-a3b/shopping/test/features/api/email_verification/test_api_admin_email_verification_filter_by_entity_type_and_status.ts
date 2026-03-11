import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test admin email verification filtering by entity type and status.
 * 1. Admin joins and authenticates
 * 2. Customer joins (creates customer email verification)
 * 3. Seller joins (creates seller email verification)
 * 4. Admin queries email verifications with various filters
 * 5. Validate filtering, sorting, and pagination work correctly
 */
export async function test_api_admin_email_verification_filter_by_entity_type_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create customer account (generates customer email verification)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Create seller account (generates seller email verification)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Query email verifications for customer entity type with pending status
  const customerVerifications =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          entity_type: "customer",
          status: "pending",
          limit: 100,
        },
      },
    );
  typia.assert(customerVerifications);
  // 5. Query email verifications for seller entity type
  const sellerVerifications =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          entity_type: "seller",
          status: "pending",
          limit: 100,
        },
      },
    );
  typia.assert(sellerVerifications);
  // 6. Test date range filtering - created_after
  const createdAfter = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const dateFiltered =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          created_after: createdAfter,
          limit: 100,
        },
      },
    );
  typia.assert(dateFiltered);
  // 7. Test sorting by created_at ascending
  const sortedAsc =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "ASC",
          limit: 100,
        },
      },
    );
  typia.assert(sortedAsc);
  // 8. Test sorting by created_at descending
  const sortedDesc =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "DESC",
          limit: 100,
        },
      },
    );
  typia.assert(sortedDesc);
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    customerVerifications.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    customerVerifications.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    customerVerifications.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    customerVerifications.pagination.pages >= 0,
  );
  // 10. Test empty results when no records match filter
  const nonExistentEmail = "nonexistent@doesnotexist.com";
  const emptyFilter =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {
          email: nonExistentEmail,
          limit: 100,
        },
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "no records match non-existent email",
    emptyFilter.data.length,
    0,
  );
}
