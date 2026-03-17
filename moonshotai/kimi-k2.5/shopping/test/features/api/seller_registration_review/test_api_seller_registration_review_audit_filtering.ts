import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_review_audit_filtering(
  connection: api.IConnection,
) {
  // 1. Setup super admin connection for reviewing - first create then login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  // Create super admin first
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Then login
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: "password123",
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // 2. Setup multiple seller connections and submit registrations
  const sellerConnections: api.IConnection[] = [];
  const registrations: IEcommerceMallSellerRegistration.ISummary[] = [];
  for (let i = 0; i < 5; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallSeller.IJoin,
    });
    sellerConnections.push(sellerConnection);
    // Submit registration
    const registration =
      await api.functional.ecommerceMall.seller.registrations.create(
        sellerConnection,
        {
          body: {
            taxIdentificationNumber: `TIN-${i}-${Date.now()}`,
            businessRegistrationNumber: `BRN-${i}-${Date.now()}`,
            businessName: `Business ${i} ${RandomGenerator.name()}`,
            businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
            reason: i < 2 ? "Valid business application" : "Pending review",
          } satisfies IEcommerceMallSellerRegistration.ICreate,
        },
      );
    // Assert to ISummary type which has the id field
    const summary =
      typia.assert<IEcommerceMallSellerRegistration.ISummary>(registration);
    registrations.push(summary);
  }
  // 3. Review registrations - approve first 2, reject next 2, leave last 1 pending
  for (let i = 0; i < 4; i++) {
    const status = i < 2 ? "approved" : "rejected";
    const updated =
      await api.functional.ecommerceMall.superAdmin.seller_registrations.update(
        superAdminConnection,
        {
          registrationId: registrations[i]!.id,
          body: {
            status: status,
            rejection_reason: i < 2 ? null : "Invalid business documents",
          } satisfies IEcommerceMallSellerRegistration.IUpdate,
        },
      );
    typia.assert(updated);
  }
  // 4. Test filtering by status = "approved"
  const approvedQuery: IEcommerceMallSellerRegistration.IRequest = {
    limit: 10,
    cursor: null,
    status: "approved",
    sellerId: null,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: "reviewedAt",
    sortOrder: "desc",
  };
  const approvedReviews =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      {
        body: approvedQuery,
      },
    );
  typia.assert(approvedReviews);
  TestValidator.predicate(
    "approved count is 2",
    approvedReviews.data.length === 2,
  );
  for (const item of approvedReviews.data) {
    TestValidator.equals("approved status", item.status, "approved");
  }
  // 5. Test filtering by status = "rejected"
  const rejectedQuery: IEcommerceMallSellerRegistration.IRequest = {
    limit: 10,
    cursor: null,
    status: "rejected",
    sellerId: null,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: "reviewedAt",
    sortOrder: "desc",
  };
  const rejectedReviews =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      {
        body: rejectedQuery,
      },
    );
  typia.assert(rejectedReviews);
  TestValidator.predicate(
    "rejected count is 2",
    rejectedReviews.data.length === 2,
  );
  for (const item of rejectedReviews.data) {
    TestValidator.equals("rejected status", item.status, "rejected");
  }
  // 6. Test reviewedAt date range filtering
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const dateRangeQuery: IEcommerceMallSellerRegistration.IRequest = {
    limit: 10,
    cursor: null,
    status: null,
    sellerId: null,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: oneHourAgo,
    reviewedAtTo: now,
    sortBy: "reviewedAt",
    sortOrder: "desc",
  };
  const dateRangeReviews =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      {
        body: dateRangeQuery,
      },
    );
  typia.assert(dateRangeReviews);
  TestValidator.predicate(
    "date range returns reviewed registrations",
    dateRangeReviews.data.length === 4,
  );
  // 7. Test sorting by reviewedAt descending (default)
  const sortedQuery: IEcommerceMallSellerRegistration.IRequest = {
    limit: 10,
    cursor: null,
    status: null,
    sellerId: null,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: "reviewedAt",
    sortOrder: "desc",
  };
  const sortedReviews =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      {
        body: sortedQuery,
      },
    );
  typia.assert(sortedReviews);
  // Verify sorting order - most recent first
  for (let i = 1; i < sortedReviews.data.length; i++) {
    const prev = sortedReviews.data[i - 1]!.reviewedAt;
    const curr = sortedReviews.data[i]!.reviewedAt;
    if (prev !== null && curr !== null) {
      TestValidator.predicate(
        `sort desc reviewedAt: ${i}`,
        new Date(prev) >= new Date(curr),
      );
    }
  }
  // 8. Test pagination with cursor
  const pageQuery: IEcommerceMallSellerRegistration.IRequest = {
    limit: 2,
    cursor: null,
    status: null,
    sellerId: null,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: "reviewedAt",
    sortOrder: "desc",
  };
  const firstPage =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
      superAdminConnection,
      {
        body: pageQuery,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page has 2 items",
    firstPage.data.length === 2,
  );
  // If there's a next page, test cursor pagination
  if (firstPage.pagination.records > 2) {
    const nextCursor = firstPage.data[firstPage.data.length - 1]?.id ?? null;
    const secondPageQuery: IEcommerceMallSellerRegistration.IRequest = {
      ...pageQuery,
      cursor: nextCursor,
    };
    const secondPage =
      await api.functional.ecommerceMall.superAdmin.seller_registrations.index(
        superAdminConnection,
        {
          body: secondPageQuery,
        },
      );
    typia.assert(secondPage);
    TestValidator.predicate(
      "second page has remaining items",
      secondPage.data.length > 0,
    );
  }
}
