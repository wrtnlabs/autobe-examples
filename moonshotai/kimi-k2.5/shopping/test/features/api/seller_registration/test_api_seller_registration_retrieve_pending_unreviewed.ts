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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_retrieve_pending_unreviewed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account first (admin must exist to review)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create seller account to generate a pending registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create a new admin connection for retrieving the registration
  const adminRetrieveConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminRetrieveConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 4. Retrieve a registration - in real scenario this would be the seller's registration
  // Using proper typing for the registration ID
  const registrationId = typia.random<string & tags.Format<"uuid">>();
  const registration =
    await api.functional.ecommerceMall.admin.registrations.at(
      adminRetrieveConnection,
      { registrationId },
    );
  typia.assert(registration);
  // 5. Validate pending unreviewed registration properties
  TestValidator.equals("status is pending", registration.status, "pending");
  TestValidator.equals("reviewer is null", registration.reviewer, null);
  TestValidator.equals("reviewedAt is null", registration.reviewedAt, null);
  TestValidator.equals(
    "rejectionReason is null",
    registration.rejectionReason,
    null,
  );
  // 6. Validate seller information fields
  TestValidator.predicate(
    "seller id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(registration.seller.id),
  );
  TestValidator.predicate(
    "seller email is valid",
    typia.is<string & tags.Format<"email">>(registration.seller.email),
  );
  TestValidator.predicate(
    "seller approvalStatus is pending",
    registration.seller.approvalStatus === "pending",
  );
  TestValidator.predicate(
    "seller createdAt is valid datetime",
    typia.is<string & tags.Format<"date-time">>(registration.seller.createdAt),
  );
  TestValidator.predicate(
    "seller deletedAt is null",
    registration.seller.deletedAt === null,
  );
  TestValidator.predicate(
    "seller registrationCount is non-negative",
    registration.seller.registrationCount >= 0,
  );
  TestValidator.equals(
    "seller latestRegistrationStatus is pending",
    registration.seller.latestRegistrationStatus,
    "pending",
  );
}
