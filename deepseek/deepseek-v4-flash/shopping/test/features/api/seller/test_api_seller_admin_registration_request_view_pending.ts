import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_seller_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

export async function test_api_seller_admin_registration_request_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Submit an administrator registration request with a known reason
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const request =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        },
      },
    );
  typia.assert(request);
  // 3. Retrieve the admin registration request by its ID
  const retrieved =
    await api.functional.eCommerceMall.seller.admin_registration_requests.at(
      sellerConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate core fields
  TestValidator.equals("id matches created request", retrieved.id, request.id);
  TestValidator.equals(
    "requester_type is seller",
    retrieved.requester_type,
    "seller",
  );
  TestValidator.equals(
    "reason matches submitted text",
    retrieved.reason,
    reason,
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  // 5. Validate requester resolves to IECommerceMallSeller.ISummary with correct data
  TestValidator.predicate(
    "seller profile exists",
    () => seller.profile !== null,
  );
  if (seller.profile === null) {
    throw new Error("Seller profile must not be null");
  }
  const requester = retrieved.requester as IECommerceMallSeller.ISummary;
  TestValidator.equals(
    "requester id matches seller id",
    requester.id,
    seller.id,
  );
  TestValidator.equals(
    "requester email matches seller email",
    requester.email,
    seller.email,
  );
  TestValidator.equals(
    "requester approval_status matches seller approval_status",
    requester.approval_status,
    seller.approval_status,
  );
  TestValidator.equals(
    "requester profile shop_name matches seller shop name",
    requester.profile.shop_name,
    seller.profile.shopName,
  );
  TestValidator.equals(
    "requester profile logo_image matches seller logo image",
    requester.profile.logo_image,
    (seller.profile.logoImage satisfies
      | (string & tags.Format<"uri">)
      | null) as (string & tags.Format<"url">) | null | undefined,
  );
}
