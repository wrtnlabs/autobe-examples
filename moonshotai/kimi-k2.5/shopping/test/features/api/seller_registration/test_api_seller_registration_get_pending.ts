import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test that an authenticated seller can successfully retrieve their own pending registration.
 *
 * This test validates the complete flow:
 * 1. Authenticate as a seller using the join endpoint
 * 2. Create a seller registration using the registration endpoint
 * 3. Retrieve the registration by ID and verify:
 *    - Registration ID matches the created registration
 *    - Status is 'pending'
 *    - reviewer_id is null
 *    - reviewed_at is null
 *    - rejection_reason is null
 *    - created_at timestamp is present
 *    - Nested seller object contains seller information
 */
export async function test_api_seller_registration_get_pending(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Create a seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // Step 3: Retrieve the registration by ID
  const retrieved =
    await api.functional.ecommerceMall.seller.seller_registrations.at(
      sellerConnection,
      {
        registrationId: (registration as any).id,
      },
    );
  typia.assert(retrieved);
  // Step 4: Validate the retrieved registration
  TestValidator.equals(
    "registration ID matches",
    (retrieved as any).id,
    (registration as any).id,
  );
  TestValidator.equals(
    "status is pending",
    (retrieved as any).status,
    "pending",
  );
  TestValidator.equals(
    "reviewer_id is null",
    (retrieved as any).reviewer_id,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null",
    (retrieved as any).reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    (retrieved as any).rejection_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is present",
    () =>
      (retrieved as any).created_at !== null &&
      (retrieved as any).created_at !== undefined,
  );
  TestValidator.predicate(
    "seller object contains seller information",
    () =>
      (retrieved as any).seller !== null &&
      (retrieved as any).seller !== undefined,
  );
}
