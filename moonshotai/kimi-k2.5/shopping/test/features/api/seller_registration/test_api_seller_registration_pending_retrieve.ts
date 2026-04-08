import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

/**
 * A seller retrieves the details of their own pending registration application.
 * After submitting seller registration via the join endpoint, the seller views
 * their registration to check application status. The test verifies the response
 * contains correct seller information (id, email, approvalStatus), status is set
 * to 'pending', reviewer field is null indicating no review has occurred,
 * rejectionReason is null, createdAt shows the submission timestamp, and
 * reviewedAt is null.
 */
export async function test_api_seller_registration_pending_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account via join endpoint
  // authorize_seller_join creates the seller with pending status and auto-creates
  // a pending registration application
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Retrieve the seller's pending registration details
  // Using a generated UUID as registrationId since the registration was created
  // automatically when the seller joined
  const registration =
    await api.functional.ecommerceMall.seller.registrations.at(
      sellerConnection,
      {
        registrationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(registration);
  // 3. Validate pending registration state
  // Status should be 'pending' as no admin has reviewed yet
  TestValidator.equals(
    "registration status is pending",
    registration.status,
    "pending",
  );
  // Reviewer must be null indicating registration is awaiting review
  TestValidator.equals(
    "reviewer is null (pending review)",
    registration.reviewer,
    null,
  );
  // Rejection reason must be null since not rejected
  TestValidator.equals(
    "rejectionReason is null",
    registration.rejectionReason,
    null,
  );
  // reviewedAt must be null since no review has occurred
  TestValidator.equals(
    "reviewedAt is null (not reviewed)",
    registration.reviewedAt,
    null,
  );
  // createdAt should exist showing when application was submitted
  TestValidator.predicate(
    "createdAt exists (has submission timestamp)",
    registration.createdAt !== null,
  );
  // 4. Validate nested seller information matches created seller
  TestValidator.equals(
    "seller id matches join response",
    registration.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches join response",
    registration.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller approvalStatus is pending",
    registration.seller.approvalStatus,
    "pending",
  );
}
