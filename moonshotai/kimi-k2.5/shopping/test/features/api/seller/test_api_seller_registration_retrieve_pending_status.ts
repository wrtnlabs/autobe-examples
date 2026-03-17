import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_retrieve_pending_status(
  connection: api.IConnection,
) {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null | undefined>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphabets(10),
          businessRegistrationNumber: RandomGenerator.alphabets(10),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // 4. Retrieve seller registration as admin
  const retrievedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.at(
      adminConnection,
      {
        registrationId: (registration as any).id,
      },
    );
  typia.assert(retrievedRegistration);
  // 5. Validate pending status fields
  TestValidator.equals(
    "id matches",
    (retrievedRegistration as any).id,
    (registration as any).id,
  );
  TestValidator.equals(
    "status is pending",
    (retrievedRegistration as any).status,
    "pending",
  );
  TestValidator.equals(
    "reviewer_id is null",
    (retrievedRegistration as any).reviewer_id,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    (retrievedRegistration as any).rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null",
    (retrievedRegistration as any).reviewed_at,
    null,
  );
  TestValidator.predicate(
    "created_at exists",
    (retrievedRegistration as any).created_at !== undefined,
  );
  TestValidator.predicate(
    "seller object exists",
    (retrievedRegistration as any).seller !== undefined,
  );
}
