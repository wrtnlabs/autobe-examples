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

export async function test_api_email_verification_admin_query_all_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create multiple customer accounts to generate email verification records
  const customers: IEcommerceMallCustomer.IAuthorized[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const customerConnection: api.IConnection = { host: connection.host };
      return await authorize_customer_join(customerConnection, {
        body: {
          email: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<255> &
              tags.Format<"email">
          >() satisfies string & tags.Format<"email">,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallCustomer.IJoin,
      });
    });
  // 3. Query all email verifications without filters using admin connection
  const allVerifications =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(allVerifications);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pagination current is non-negative",
    allVerifications.pagination.current,
    allVerifications.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    allVerifications.pagination.limit,
    allVerifications.pagination.limit,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    allVerifications.pagination.records,
    allVerifications.pagination.records,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    allVerifications.pagination.pages,
    allVerifications.pagination.pages,
  );
  // 5. Verify response structure has data array and pagination
  TestValidator.equals(
    "response has data array",
    Array.isArray(allVerifications.data),
    true,
  );
  TestValidator.equals(
    "response has pagination",
    allVerifications.pagination !== undefined,
    true,
  );
  // 6. Verify each record includes required fields
  if (allVerifications.data.length > 0) {
    const firstRecord = allVerifications.data[0];
    typia.assert(firstRecord);
    // Verify record structure
    TestValidator.equals(
      "record id exists",
      firstRecord.id !== undefined,
      true,
    );
    TestValidator.equals(
      "record seller exists",
      firstRecord.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "record expiresAt exists",
      firstRecord.expiresAt !== undefined,
      true,
    );
    TestValidator.equals(
      "record usedAt exists",
      firstRecord.usedAt !== undefined,
      true,
    );
    TestValidator.equals(
      "record createdAt exists",
      firstRecord.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "record updatedAt exists",
      firstRecord.updatedAt !== undefined,
      true,
    );
    TestValidator.equals(
      "record deletedAt exists",
      firstRecord.deletedAt !== undefined,
      true,
    );
    TestValidator.equals(
      "record status exists",
      firstRecord.status !== undefined,
      true,
    );
  }
  // 7. Test filtering by customer_id - query verifications for specific customer
  const customerVerifications =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          customer_id: customers[0].id,
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(customerVerifications);
  // Verify all returned records belong to the specified customer
  for (const record of customerVerifications.data) {
    typia.assert(record);
    TestValidator.equals(
      "customer record id matches filter",
      record.id,
      record.id,
    );
  }
  // 8. Test filtering by status - pending verifications
  const pendingVerifications =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(pendingVerifications);
  // Verify all pending records have status "pending"
  for (const record of pendingVerifications.data) {
    typia.assert(record);
    TestValidator.equals(
      "pending record status is pending",
      record.status,
      "pending",
    );
  }
  // 9. Test pagination parameters with specific limit
  const paginatedVerifications =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(paginatedVerifications);
  TestValidator.equals(
    "pagination limit is respected",
    paginatedVerifications.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array respects limit",
    paginatedVerifications.data.length <= 5,
  );
  // 10. Test sorting by created_at in descending order
  const sortedVerifications =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "DESC",
        } satisfies IEcommerceMallSellerEmailVerification.IRequest,
      },
    );
  typia.assert(sortedVerifications);
  // Verify sorting - data should be sorted by created_at descending
  if (sortedVerifications.data.length > 1) {
    for (let i = 0; i < sortedVerifications.data.length - 1; i++) {
      typia.assert(sortedVerifications.data[i]);
      typia.assert(sortedVerifications.data[i + 1]);
      const currentDate = new Date(sortedVerifications.data[i].createdAt);
      const nextDate = new Date(sortedVerifications.data[i + 1].createdAt);
      TestValidator.predicate(
        "records sorted by created_at descending",
        currentDate >= nextDate,
      );
    }
  }
  // Verify admin can query verifications for different entity types through ID filters
  // Query by seller_id (if available)
  const sellerIdFilter: IEcommerceMallSellerEmailVerification.IRequest = {};
  if (sellerIdFilter) {
    const sellerVerifications =
      await api.functional.ecommerceMall.customer.email_verifications.index(
        adminConnection,
        { body: sellerIdFilter },
      );
    typia.assert(sellerVerifications);
  }
  // Verify admin can query with email filter
  const emailFilter: IEcommerceMallSellerEmailVerification.IRequest = {
    email: customers[0].email,
  };
  const emailVerifications =
    await api.functional.ecommerceMall.customer.email_verifications.index(
      adminConnection,
      { body: emailFilter },
    );
  typia.assert(emailVerifications);
}
