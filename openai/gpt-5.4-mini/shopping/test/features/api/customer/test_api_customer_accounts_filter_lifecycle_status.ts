import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_accounts_filter_lifecycle_status(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const firstPage = await api.functional.mallPlatform.customer.accounts.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "-createdAt",
      } satisfies IMallPlatformSellerAccount.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page should be at least 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "returned data length should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const emptySearchTerm = `no-match-${RandomGenerator.alphaNumeric(12)}`;
  const emptySearchPage =
    await api.functional.mallPlatform.customer.accounts.index(
      customerConnection,
      {
        body: {
          search: emptySearchTerm,
          page: 1,
          limit: 5,
          sort: "+email",
        } satisfies IMallPlatformSellerAccount.IRequest,
      },
    );
  typia.assert(emptySearchPage);
  TestValidator.equals(
    "empty search should return zero records",
    emptySearchPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should return zero rows",
    emptySearchPage.data.length,
    0,
  );
  const approvalStatuses = ["pending", "approved", "rejected"] as const;
  for (const approvalStatus of approvalStatuses) {
    const filtered = await api.functional.mallPlatform.customer.accounts.index(
      customerConnection,
      {
        body: {
          approvalStatus,
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IMallPlatformSellerAccount.IRequest,
      },
    );
    typia.assert(filtered);
    TestValidator.predicate(
      `filtered page data length should not exceed limit for ${approvalStatus}`,
      filtered.data.length <= filtered.pagination.limit,
    );
    for (const summary of filtered.data) {
      typia.assert(summary);
      TestValidator.equals(
        `approval status should match ${approvalStatus}`,
        summary.approvalStatus,
        approvalStatus,
      );
      if (summary.rejectionReason !== null) {
        TestValidator.predicate(
          `rejection reason should be non-empty for ${approvalStatus}`,
          summary.rejectionReason.length > 0,
        );
      }
    }
  }
  const secondPage = await api.functional.mallPlatform.customer.accounts.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 5,
        sort: "-createdAt",
      } satisfies IMallPlatformSellerAccount.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page limit should echo request",
    secondPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "second page data length should not exceed limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  const searchByEmailTerm = joined.email.slice(
    0,
    Math.min(6, joined.email.length),
  );
  const emailSearchPage =
    await api.functional.mallPlatform.customer.accounts.index(
      customerConnection,
      {
        body: {
          search: searchByEmailTerm,
          page: 1,
          limit: 10,
          sort: "+email",
        } satisfies IMallPlatformSellerAccount.IRequest,
      },
    );
  typia.assert(emailSearchPage);
  TestValidator.predicate(
    "email search data length should not exceed limit",
    emailSearchPage.data.length <= emailSearchPage.pagination.limit,
  );
  if (emailSearchPage.pagination.records > 0) {
    TestValidator.predicate(
      "email search should return at least one matching record when records exist",
      emailSearchPage.data.some((summary) =>
        summary.email.includes(searchByEmailTerm),
      ),
    );
  }
}
