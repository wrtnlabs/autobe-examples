import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function test_api_admin_email_verification_list_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(admin);
  // 2. Admin calls email verification index endpoint with no filters
  const response =
    await api.functional.ecommerceMall.admin.email_verifications.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Verify response structure has pagination and data
  TestValidator.predicate(
    "response has pagination metadata",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    response.data !== undefined,
  );
  // 4. Verify pagination metadata structure
  const pagination: IPage.IPagination = response.pagination;
  typia.assert(pagination);
  TestValidator.predicate(
    "pagination has current page",
    pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records count",
    pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages count",
    pagination.pages !== undefined,
  );
  // 5. Verify pagination consistency
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    expectedPages,
  );
  // 6. Verify each record in the data array
  for (const i in response.data) {
    const record = response.data[i];
    typia.assert(record);
    // 7. Verify required fields exist (typia.assert validates all fields)
    TestValidator.predicate(`record ${i} has id`, record.id !== undefined);
    TestValidator.predicate(
      `record ${i} has seller`,
      record.seller !== undefined,
    );
    TestValidator.predicate(
      `record ${i} has expiresAt`,
      record.expiresAt !== undefined,
    );
    TestValidator.predicate(
      `record ${i} has usedAt`,
      record.usedAt !== undefined,
    );
    TestValidator.predicate(
      `record ${i} has createdAt`,
      record.createdAt !== undefined,
    );
    TestValidator.predicate(
      `record ${i} has updatedAt`,
      record.updatedAt !== undefined,
    );
    TestValidator.predicate(
      `record ${i} has deletedAt`,
      record.deletedAt !== undefined,
    );
    TestValidator.predicate(
      `record ${i} has status`,
      record.status !== undefined,
    );
    // 8. Verify seller summary structure
    const seller: IEcommerceMallSeller.ISummary = record.seller;
    typia.assert(seller);
    // Seller fields validated by typia.assert above
    // Verifying seller has required fields
    TestValidator.predicate(`seller ${i} has id`, seller.id !== undefined);
    TestValidator.predicate(
      `seller ${i} has email`,
      seller.email !== undefined,
    );
    TestValidator.predicate(
      `seller ${i} has approvalStatus`,
      seller.approvalStatus !== undefined,
    );
    TestValidator.predicate(
      `seller ${i} has rejectionReason`,
      seller.rejectionReason !== undefined,
    );
    TestValidator.predicate(
      `seller ${i} has isSuspended`,
      seller.isSuspended !== undefined,
    );
    TestValidator.predicate(
      `seller ${i} has isBanned`,
      seller.isBanned !== undefined,
    );
    TestValidator.predicate(
      `seller ${i} has createdAt`,
      seller.createdAt !== undefined,
    );
    TestValidator.predicate(
      `seller ${i} has updatedAt`,
      seller.updatedAt !== undefined,
    );
    // 9. Verify status values are valid enum values
    TestValidator.predicate(
      `record ${i} has valid status`,
      ["pending", "used", "expired"].includes(record.status),
    );
  }
}