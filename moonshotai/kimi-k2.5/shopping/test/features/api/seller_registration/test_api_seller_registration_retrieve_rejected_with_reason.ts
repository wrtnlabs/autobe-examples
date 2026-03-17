import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_retrieve_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create and authenticate customer (who will apply to become seller)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Create seller registration as customer
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      customerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph(),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // 4. Reject the registration as admin with a specific reason
  const rejectionReason =
    "Business documentation incomplete - missing tax certificate and invalid registration number";
  await api.functional.ecommerceMall.admin.seller_registrations.update(
    adminConnection,
    {
      registrationId: (registration as any).id,
      body: {
        status: "rejected",
        rejection_reason: rejectionReason,
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  // 5. Retrieve the rejected registration
  const retrieved =
    await api.functional.ecommerceMall.admin.seller_registrations.at(
      adminConnection,
      {
        registrationId: (registration as any).id,
      },
    );
  typia.assert(retrieved);
  // 6. Validate rejection audit trail details
  TestValidator.equals(
    "status is rejected",
    (retrieved as any).status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason matches provided reason",
    (retrieved as any).rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "reviewer_id matches rejecting administrator",
    (retrieved as any).reviewer_id,
    admin.id,
  );
  TestValidator.predicate(
    "reviewed_at timestamp exists",
    (retrieved as any).reviewed_at !== null &&
      (retrieved as any).reviewed_at !== undefined,
  );
}
