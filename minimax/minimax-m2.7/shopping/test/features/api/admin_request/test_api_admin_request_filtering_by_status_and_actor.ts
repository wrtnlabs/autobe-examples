import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_filtering_by_status_and_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create admin request from a customer (pending, super_admin)
  const customerRequestConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(customerRequestConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "super_admin",
      reason: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 8,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create admin request from a seller (pending, super_admin)
  const sellerRequestConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(sellerRequestConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "super_admin",
      reason: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 8,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create another customer request (pending, admin grade)
  const customerAdminGradeConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_join(customerAdminGradeConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 8,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create another seller request (pending, admin grade)
  const sellerAdminGradeConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(sellerAdminGradeConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 8,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 6. Test filtering by status='pending' only (should return all pending requests)
  const pendingOnlyResult =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(pendingOnlyResult);
  TestValidator.predicate(
    "pending filter should return at least the requests we created",
    pendingOnlyResult.data.length >= 4,
  );
  // 7. Test filtering by actorType='seller' only (should return seller requests)
  const sellerOnlyResult =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "seller",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(sellerOnlyResult);
  for (const request of sellerOnlyResult.data) {
    TestValidator.equals(
      "actorType should be 'seller' when filtering by seller",
      request.actorType,
      "seller",
    );
  }
  // 8. Test filtering by requestedGrade='super_admin' only
  const superAdminGradeResult =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          requestedGrade: "super_admin",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(superAdminGradeResult);
  for (const request of superAdminGradeResult.data) {
    TestValidator.equals(
      "requestedGrade should be 'super_admin' when filtering by super_admin",
      request.requestedGrade,
      "super_admin",
    );
  }
  // 9. Test combined filter: status='pending', actorType='seller', requestedGrade='super_admin'
  const combinedFilterResult =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          actorType: "seller",
          requestedGrade: "super_admin",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Validate all returned requests match the combined filter criteria
  for (const request of combinedFilterResult.data) {
    TestValidator.equals(
      "status should be 'pending'",
      request.status,
      "pending",
    );
    TestValidator.equals(
      "actorType should be 'seller'",
      request.actorType,
      "seller",
    );
    TestValidator.equals(
      "requestedGrade should be 'super_admin'",
      request.requestedGrade,
      "super_admin",
    );
  }
  // Verify that the combined filter returns exactly the seller super_admin pending request
  TestValidator.equals(
    "combined filter should return exactly 1 seller super_admin pending request",
    combinedFilterResult.data.length,
    1,
  );
  // 10. Test filter that should return empty results
  const emptyFilterResult =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          actorType: "seller",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "approved seller filter should return no results",
    emptyFilterResult.data.length,
    0,
  );
}
