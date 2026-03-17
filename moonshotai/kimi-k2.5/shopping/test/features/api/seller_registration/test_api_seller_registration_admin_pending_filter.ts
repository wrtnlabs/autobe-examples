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

export async function test_api_seller_registration_admin_pending_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - create admin connection and join (join also logs in)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 2. Create two sellers and submit registrations
  const sellerConnection1: api.IConnection = { host: connection.host };
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection1, {
    body: {
      email: seller1Email,
      password: seller1Password,
    },
  });
  // Submit first seller registration
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerConnection1,
    {},
  );
  const sellerConnection2: api.IConnection = { host: connection.host };
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection2, {
    body: {
      email: seller2Email,
      password: seller2Password,
    },
  });
  // Submit second seller registration
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerConnection2,
    {},
  );
  // 3. Admin queries pending registrations with filter
  const response = await api.functional.ecommerceMall.admin.registrations.index(
    adminConnection,
    {
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
  // 4. Validate complete response structure
  typia.assert(response);
  // 5. Business logic validations - verify we have at least 2 pending registrations
  TestValidator.predicate(
    "at least 2 pending registrations exist",
    response.data.length >= 2,
  );
  // Verify all returned items have pending status (business logic check)
  const allPending = response.data.every((reg) => reg.status === "pending");
  TestValidator.predicate(
    "all returned registrations have pending status",
    allPending,
  );
  // Verify pending registrations have null reviewer (business rule: pending = not reviewed)
  const allHaveNullReviewer = response.data.every(
    (reg) => reg.reviewer === null,
  );
  TestValidator.predicate(
    "pending registrations have no reviewer",
    allHaveNullReviewer,
  );
  // Verify pagination metadata consistency
  TestValidator.equals(
    "records count matches data length when under limit",
    response.pagination.records === response.data.length ||
      response.pagination.records > response.data.length,
    true,
  );
}
