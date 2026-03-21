import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_approval_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access seller approvals listing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Get paginated seller approvals listing with default descending order by createdAt
  const response =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure matches IPageIEcommerceMallSellerApproval.ISummary
  TestValidator.equals(
    "has pagination metadata",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid total records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total pages",
    response.pagination.pages >= 0,
  );
  // 5. Validate records are returned in descending order by creation date
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentDate = new Date(response.data[i].created_at).getTime();
    const nextDate = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "records ordered by created_at descending",
      currentDate >= nextDate,
    );
  }
  // 6. Validate each approval record structure
  for (const approval of response.data) {
    typia.assert(approval);
    // Validate seller information exists
    TestValidator.equals(
      "seller info exists",
      approval.seller !== null && approval.seller !== undefined,
      true,
    );
    TestValidator.predicate(
      "seller has id",
      typeof approval.seller.id === "string",
    );
    TestValidator.predicate(
      "seller has email",
      typeof approval.seller.email === "string",
    );
    TestValidator.predicate(
      "seller has approval_status",
      typeof approval.seller.approval_status === "string",
    );
    // Validate approval status
    TestValidator.predicate(
      "approval status is valid string",
      ["pending", "approved", "rejected"].includes(approval.status),
    );
    // Validate timestamps
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(new Date(approval.created_at).getTime()),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      !isNaN(new Date(approval.updated_at).getTime()),
    );
    // Validate reviewedByAdmin is null when pending, or has data when reviewed
    if (approval.status === "pending") {
      TestValidator.equals(
        "pending approval has no reviewing admin",
        approval.reviewedByAdmin,
        null,
      );
    } else {
      TestValidator.predicate(
        "reviewed approval has admin info",
        approval.reviewedByAdmin !== null &&
          approval.reviewedByAdmin !== undefined,
      );
    }
  }
  // 7. Test pagination - verify second page returns different data
  const firstPage =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(secondPage);
  // Verify pagination metadata
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  TestValidator.equals("limit matches", firstPage.pagination.limit, 5);
  TestValidator.equals(
    "pages equal",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.equals(
    "total records equal",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
}
