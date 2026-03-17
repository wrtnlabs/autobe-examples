import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerRegistration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test that an authenticated administrator can successfully query and retrieve
 * a paginated list of pending seller registration applications.
 */
export async function test_api_seller_registration_admin_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // 3. Submit seller registration using seller connection
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  // 4. Admin queries pending seller registrations
  const requestBody = {
    limit: 20,
    cursor: null,
    status: "pending" as const,
    sellerId: null,
    reviewerId: null,
    createdAtFrom: null,
    createdAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
    page: null,
  } satisfies IEcommerceMallSellerRegistration.IRequest;
  const page =
    await api.functional.ecommerceMall.admin.seller_registrations.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // 5. Validate response
  typia.assert(page);
  // Find the created registration in results
  const foundRegistration = page.data.find(
    (item) => item.seller.id === seller.id,
  );
  TestValidator.predicate(
    "created registration found in pending list",
    foundRegistration !== undefined,
  );
  if (foundRegistration !== undefined) {
    TestValidator.equals(
      "registration status is pending",
      foundRegistration.status,
      "pending",
    );
    TestValidator.equals(
      "rejection reason is null for pending registration",
      foundRegistration.rejectionReason,
      null,
    );
    TestValidator.equals(
      "reviewedAt is null for pending registration",
      foundRegistration.reviewedAt,
      null,
    );
    TestValidator.equals(
      "reviewer is null for pending registration",
      foundRegistration.reviewer,
      null,
    );
    TestValidator.equals(
      "seller id matches",
      foundRegistration.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "seller email matches",
      foundRegistration.seller.email,
      seller.email,
    );
  }
}
