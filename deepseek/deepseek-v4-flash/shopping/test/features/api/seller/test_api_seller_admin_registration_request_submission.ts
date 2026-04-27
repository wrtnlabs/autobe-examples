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

export async function test_api_seller_admin_registration_request_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Submit an administrator registration request with a specific reason
  const reason =
    "I want to help manage platform categories and seller approvals";
  const registrationRequest =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        },
      },
    );
  typia.assert(registrationRequest);
  // 3. Verify response fields match expected values
  // 3.1. Basic identity and type fields
  TestValidator.predicate("id is valid uuid", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registrationRequest.id,
    ),
  );
  TestValidator.equals(
    "requester_type",
    registrationRequest.requester_type,
    "seller",
  );
  TestValidator.equals(
    "reason matches submitted",
    registrationRequest.reason,
    reason,
  );
  TestValidator.equals(
    "status is pending",
    registrationRequest.status,
    "pending",
  );
  // 3.2. Null fields for pending request
  TestValidator.equals(
    "rejection_reason is null",
    registrationRequest.rejection_reason,
    null,
  );
  TestValidator.equals("reviewer is null", registrationRequest.reviewer, null);
  TestValidator.equals(
    "reviewed_at is null",
    registrationRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null",
    registrationRequest.deleted_at,
    null,
  );
  // 3.3. Timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(registrationRequest.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(registrationRequest.updated_at)),
  );
  // 3.4. Validate requester using requester_type discriminator
  if (registrationRequest.requester_type === "seller") {
    const requesterSeller =
      registrationRequest.requester as IECommerceMallSeller.ISummary;
    typia.assert(requesterSeller);
    TestValidator.equals(
      "requester id matches seller id",
      requesterSeller.id,
      seller.id,
    );
  }
}
