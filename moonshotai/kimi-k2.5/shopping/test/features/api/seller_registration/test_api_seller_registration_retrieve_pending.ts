import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test retrieving a pending seller registration as super administrator.
 * This is the primary success path for new registrations awaiting review.
 *
 * 1. Authenticate as a super administrator using the join endpoint.
 * 2. Authenticate as a seller and create a seller registration.
 * 3. Call the target GET endpoint with the returned registrationId.
 * 4. Verify the response contains: complete registration details including
 *    id, seller_id, status='pending', created_at timestamp; nested seller object
 *    with seller information; null reviewer_id and null rejection_reason since
 *    the registration has not been reviewed yet; reviewed_at should be null.
 */
export async function test_api_seller_registration_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // 2. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create seller registration with pending status
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
          businessName: RandomGenerator.name(3),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registration);
  // 4. Retrieve the registration as super administrator
  const retrieved =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.at(
      superAdminConnection,
      { registrationId: (registration as any).id },
    );
  typia.assert(retrieved);
  // 5. Verify specific fields for pending registration
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
  TestValidator.predicate(
    "reviewer_id is null",
    (retrieved as any).reviewer_id === null,
  );
  TestValidator.predicate(
    "rejection_reason is null",
    (retrieved as any).rejection_reason === null,
  );
  TestValidator.predicate(
    "reviewed_at is null",
    (retrieved as any).reviewed_at === null,
  );
  TestValidator.predicate(
    "created_at exists",
    (retrieved as any).created_at !== null,
  );
  TestValidator.predicate(
    "seller object exists",
    (retrieved as any).seller !== undefined,
  );
}
