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

export async function test_api_approval_requests_browse_pending_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  //-----
  // Setup
  //-----
  // 1. Create a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Promote to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 3. Create Seller A
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  // 4. Seller A submits a registration approval request
  const approvalA =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerAConnection,
    );
  typia.assert(approvalA);
  // 5. Create Seller B
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  // 6. Seller B submits a registration approval request
  const approvalB =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerBConnection,
    );
  typia.assert(approvalB);
  //-----
  // Test: Browse all pending approval requests
  //-----
  const page =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page);
  // Validate basic structure
  TestValidator.predicate(
    "at least 2 pending records",
    page.pagination.records >= 2,
  );
  // Validate each record's pending-only structure
  for (const record of page.data) {
    TestValidator.equals("status is pending", record.status, "pending");
    TestValidator.equals(
      "rejection_reason is null",
      record.rejection_reason,
      null,
    );
    TestValidator.equals("reviewer is null", record.reviewer, null);
    TestValidator.equals("reviewed_at is null", record.reviewed_at, null);
  }
  // Validate sort order: newest first (Seller B before Seller A)
  if (page.data.length >= 2) {
    const firstDate = new Date(page.data[0].created_at).getTime();
    const secondDate = new Date(page.data[1].created_at).getTime();
    TestValidator.predicate("newest first sort order", firstDate >= secondDate);
  }
  //-----
  // Test: Pagination - page 1 with limit 1
  //-----
  const page1 =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 1,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 has exactly 1 record", page1.data.length, 1);
  TestValidator.predicate(
    "pagination.records >= 2",
    page1.pagination.records >= 2,
  );
  TestValidator.predicate("pagination.pages >= 2", page1.pagination.pages >= 2);
  //-----
  // Test: Pagination - page 2 with limit 1
  //-----
  const page2 =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 2,
          limit: 1,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 has exactly 1 record", page2.data.length, 1);
  TestValidator.notEquals(
    "page 2 record differs from page 1",
    page2.data[0].id,
    page1.data[0].id,
  );
}
