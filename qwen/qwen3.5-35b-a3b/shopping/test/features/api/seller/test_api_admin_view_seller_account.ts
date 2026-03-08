import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_view_seller_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Get a random seller UUID for testing
  const testSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin retrieves the seller account details
  const sellerDetail = await api.functional.ecommerceMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: testSellerId,
    },
  );
  typia.assert(sellerDetail);
  // 4. Validate response structure and field types
  TestValidator.equals("seller id is UUID", sellerDetail.id, sellerDetail.id);
  TestValidator.predicate("email is valid format", () => {
    const emailRegex =
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    return emailRegex.test(sellerDetail.email);
  });
  TestValidator.equals(
    "approval status is valid",
    sellerDetail.approvalStatus,
    "pending" as const,
  );
  TestValidator.equals(
    "is suspended is boolean",
    sellerDetail.isSuspended,
    false,
  );
  TestValidator.equals("is banned is boolean", sellerDetail.isBanned, false);
  TestValidator.equals("deleted at is null", sellerDetail.deletedAt, null);
  TestValidator.equals(
    "rejection reason is null for non-rejected",
    sellerDetail.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    () => !isNaN(Date.parse(sellerDetail.createdAt)),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    () => !isNaN(Date.parse(sellerDetail.updatedAt)),
  );
  // 5. Verify response contains expected fields
  const expectedFields = [
    "id",
    "email",
    "approvalStatus",
    "rejectionReason",
    "isSuspended",
    "isBanned",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ];
  for (const field of expectedFields) {
    TestValidator.predicate(
      `${field} field is present`,
      () => field in sellerDetail,
    );
  }
}
