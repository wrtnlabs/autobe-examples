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

export async function test_api_admin_seller_registration_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Create multiple sellers with registrations
  const sellers: IEcommerceMallSeller.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const sellerConn: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
    sellers.push(seller);
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConn,
      {
        body: typia.random<IEcommerceMallSellerRegistration.ICreate>(),
      },
    );
  }
  // Test filtering by pending status - should return registrations
  for (const seller of sellers) {
    const pendingResult =
      await api.functional.ecommerceMall.admin.sellers.registrations.index(
        adminConnection,
        {
          sellerId: seller.id,
          body: {
            limit: 10,
            cursor: null,
            status: "pending",
            sellerId: null,
            reviewerId: null,
            createdAtFrom: null,
            createdAtTo: null,
            reviewedAtFrom: null,
            reviewedAtTo: null,
            sortBy: null,
            sortOrder: null,
          } satisfies IEcommerceMallSellerRegistration.IRequest,
        },
      );
    typia.assert(pendingResult);
    TestValidator.predicate(
      "pending filter returns registrations",
      pendingResult.data.length > 0,
    );
    TestValidator.predicate(
      "all returned registrations have pending status",
      pendingResult.data.every((r) => r.status === "pending"),
    );
  }
  // Test filtering by approved status - should return empty
  for (const seller of sellers) {
    const approvedResult =
      await api.functional.ecommerceMall.admin.sellers.registrations.index(
        adminConnection,
        {
          sellerId: seller.id,
          body: {
            limit: 10,
            cursor: null,
            status: "approved",
            sellerId: null,
            reviewerId: null,
            createdAtFrom: null,
            createdAtTo: null,
            reviewedAtFrom: null,
            reviewedAtTo: null,
            sortBy: null,
            sortOrder: null,
          } satisfies IEcommerceMallSellerRegistration.IRequest,
        },
      );
    typia.assert(approvedResult);
    TestValidator.equals(
      "approved filter returns empty for unapproved registrations",
      approvedResult.data.length,
      0,
    );
  }
  // Test filtering by rejected status - should return empty
  for (const seller of sellers) {
    const rejectedResult =
      await api.functional.ecommerceMall.admin.sellers.registrations.index(
        adminConnection,
        {
          sellerId: seller.id,
          body: {
            limit: 10,
            cursor: null,
            status: "rejected",
            sellerId: null,
            reviewerId: null,
            createdAtFrom: null,
            createdAtTo: null,
            reviewedAtFrom: null,
            reviewedAtTo: null,
            sortBy: null,
            sortOrder: null,
          } satisfies IEcommerceMallSellerRegistration.IRequest,
        },
      );
    typia.assert(rejectedResult);
    TestValidator.equals(
      "rejected filter returns empty for unrejected registrations",
      rejectedResult.data.length,
      0,
    );
  }
}
