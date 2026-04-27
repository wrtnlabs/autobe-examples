import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_approval_requests_filter_by_status_and_search(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Setup: Administrator → Super Administrator
  //----
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Promote admin to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  //----
  // Setup: Seller A (alice.shop@example.com) → approved
  //----
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: "alice.shop@example.com",
      password: "1234",
      shop_name: "Alice Shop",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const requestA =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerAConnection,
    );
  typia.assert(requestA);
  await api.functional.eCommerceMall.superAdministrator.approval_requests.update(
    superAdminConnection,
    {
      requestId: requestA.id,
      body: {
        status: "approved",
      } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
    },
  );
  //----
  // Setup: Seller B (bob.shop@example.com) → rejected
  //----
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: "bob.shop@example.com",
      password: "1234",
      shop_name: "Bob Shop",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const requestB =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerBConnection,
    );
  typia.assert(requestB);
  await api.functional.eCommerceMall.superAdministrator.approval_requests.update(
    superAdminConnection,
    {
      requestId: requestB.id,
      body: {
        status: "rejected",
        rejection_reason: "Incomplete business documentation",
      } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
    },
  );
  //----
  // Setup: Seller C (charlie.shop@example.com) → pending
  //----
  const sellerCConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerCConnection, {
    body: {
      email: "charlie.shop@example.com",
      password: "1234",
      shop_name: "Charlie Shop",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const requestC =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerCConnection,
    );
  typia.assert(requestC);
  //----
  // Test 1: Filter by status = "approved"
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
        superAdminConnection,
        {
          body: {
            status: "approved",
          } satisfies IECommerceMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("approved count", result.data.length, 1);
    TestValidator.equals("approved status", result.data[0].status, "approved");
    TestValidator.predicate(
      "approved has reviewer",
      () => result.data[0].reviewer !== null,
    );
    TestValidator.predicate(
      "approved has reviewed_at",
      () => result.data[0].reviewed_at !== null,
    );
    TestValidator.equals(
      "approved no rejection_reason",
      result.data[0].rejection_reason,
      null,
    );
    TestValidator.equals(
      "approved seller is Alice",
      result.data[0].seller.email,
      "alice.shop@example.com",
    );
  }
  //----
  // Test 2: Filter by status = "rejected"
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
        superAdminConnection,
        {
          body: {
            status: "rejected",
          } satisfies IECommerceMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("rejected count", result.data.length, 1);
    TestValidator.equals("rejected status", result.data[0].status, "rejected");
    TestValidator.equals(
      "rejection reason",
      result.data[0].rejection_reason,
      "Incomplete business documentation",
    );
    TestValidator.predicate(
      "rejected has reviewer",
      () => result.data[0].reviewer !== null,
    );
    TestValidator.equals(
      "rejected seller is Bob",
      result.data[0].seller.email,
      "bob.shop@example.com",
    );
  }
  //----
  // Test 3: Filter by status = "pending"
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
        superAdminConnection,
        {
          body: {
            status: "pending",
          } satisfies IECommerceMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("pending count", result.data.length, 1);
    TestValidator.equals("pending status", result.data[0].status, "pending");
    TestValidator.equals("pending no reviewer", result.data[0].reviewer, null);
    TestValidator.equals(
      "pending no reviewed_at",
      result.data[0].reviewed_at,
      null,
    );
    TestValidator.equals(
      "pending seller is Charlie",
      result.data[0].seller.email,
      "charlie.shop@example.com",
    );
  }
  //----
  // Test 4: Search by seller email partial match
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
        superAdminConnection,
        {
          body: {
            search: "alice",
          } satisfies IECommerceMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("search alice count", result.data.length, 1);
    TestValidator.equals(
      "search alice email",
      result.data[0].seller.email,
      "alice.shop@example.com",
    );
  }
  //----
  // Test 5: Combined filter (search + status)
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
        superAdminConnection,
        {
          body: {
            search: "bob",
            status: "rejected",
          } satisfies IECommerceMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("combined count", result.data.length, 1);
    TestValidator.equals(
      "combined status rejected",
      result.data[0].status,
      "rejected",
    );
    TestValidator.equals(
      "combined seller is Bob",
      result.data[0].seller.email,
      "bob.shop@example.com",
    );
  }
  //----
  // Test 6: Review date range filter
  //----
  {
    const today = new Date();
    const from = `${today.toISOString().substring(0, 10)}T00:00:00.000Z`;
    const to = `${today.toISOString().substring(0, 10)}T23:59:59.999Z`;
    const result =
      await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
        superAdminConnection,
        {
          body: {
            reviewed_at_from: from,
            reviewed_at_to: to,
          } satisfies IECommerceMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("date range count", result.data.length, 2);
    TestValidator.predicate("all reviewed in date range", () =>
      result.data.every((r) => r.status !== "pending"),
    );
    TestValidator.predicate("no pending in date range", () =>
      result.data.every((r) => r.reviewed_at !== null),
    );
  }
  //----
  // Test 7: No matching results
  //----
  {
    const result =
      await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
        superAdminConnection,
        {
          body: {
            status: "approved",
            search: "nonexistent",
          } satisfies IECommerceMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("no results count", result.data.length, 0);
    TestValidator.equals("no results records", result.pagination.records, 0);
  }
}
