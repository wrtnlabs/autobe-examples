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

/**
 * Test retrieving an APPROVED seller registration.
 * Validates the response structure for approved registrations including
 * reviewer information, approval timestamp, and approval status.
 */
export async function test_api_seller_registration_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Retrieve seller registration
  const registration: IEcommerceMallSellerRegistration =
    await api.functional.ecommerceMall.admin.registrations.at(adminConnection, {
      registrationId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(registration);
  // 3. Validate approved registration specific fields
  TestValidator.equals(
    "registration status is approved",
    registration.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewer is not null for approved registration",
    registration.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewedAt timestamp exists for approved registration",
    registration.reviewedAt !== null,
  );
  TestValidator.equals(
    "rejectionReason is null for approved registration",
    registration.rejectionReason,
    null,
  );
  // Validate seller's approval status reflects approved state
  TestValidator.equals(
    "seller approvalStatus is approved",
    registration.seller.approvalStatus,
    "approved",
  );
}
