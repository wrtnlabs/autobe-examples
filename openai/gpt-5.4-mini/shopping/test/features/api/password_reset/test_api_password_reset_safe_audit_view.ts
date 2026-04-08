import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_password_reset_safe_audit_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify password reset browsing remains read-only and safe for audit review.
   *
   * This test registers a customer account, then queries the password reset browsing endpoint twice with the same neutral criteria. It validates that repeated reads do not mutate any reset record and that any returned rows contain only safe lifecycle metadata with nested seller summaries.
   *
   * 1. Register a customer account and obtain an authenticated session.
   * 2. Query password reset browsing using a stable, safe filter set.
   * 3. Repeat the same query to confirm the response is unchanged.
   * 4. Validate pagination and ensure returned summaries do not expose secret credential material.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const request = {
    accountType: "customer",
    accountId: customer.id,
    status: null,
    createdFrom: null,
    createdTo: null,
    expiredFrom: null,
    expiredTo: null,
    sort: null,
    page: 1,
    limit: 50,
  } satisfies IMallPlatformSellerPasswordReset.IRequest;
  const first = await api.functional.mallPlatform.customer.passwordResets.index(
    customerConnection,
    { body: request },
  );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.customer.passwordResets.index(
      customerConnection,
      { body: request },
    );
  typia.assert(second);
  TestValidator.equals(
    "repeat audit reads return identical pagination",
    first.pagination,
    second.pagination,
  );
  TestValidator.equals(
    "repeat audit reads return identical data",
    first.data,
    second.data,
  );
  TestValidator.predicate(
    "pagination has valid non-negative counts",
    first.pagination.current >= 0 &&
      first.pagination.limit >= 0 &&
      first.pagination.records >= 0 &&
      first.pagination.pages >= 0,
  );
  for (const item of first.data) {
    TestValidator.predicate(
      "summary contains lifecycle metadata only",
      item.id.length > 0 &&
        item.createdAt.length > 0 &&
        item.updatedAt.length > 0 &&
        (item.expiredAt === null || item.expiredAt.length > 0) &&
        (item.consumedAt === null || item.consumedAt.length > 0) &&
        (item.deletedAt === null || item.deletedAt.length > 0) &&
        item.sellerAccount.id.length > 0 &&
        item.sellerAccount.email.length > 0,
    );
    TestValidator.equals(
      "seller account is summarized safely",
      Object.keys(item.sellerAccount).sort(),
      [
        "createdAt",
        "deletedAt",
        "email",
        "id",
        "rejectionReason",
        "status",
        "updatedAt",
      ].sort(),
    );
    TestValidator.predicate(
      "reset summary does not expose secret credential fields",
      !("token" in item) &&
        !("passwordHash" in item) &&
        !("resetToken" in item),
    );
  }
}
