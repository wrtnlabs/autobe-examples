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

export async function test_api_seller_registration_retrieve_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function (POST /ecommerceMall/auth/admin/join)
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Retrieve seller registration via GET /ecommerceMall/admin/registrations/{registrationId}
  const registration =
    await api.functional.ecommerceMall.admin.registrations.at(adminConnection, {
      registrationId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(registration);
  // Validate business logic: rejected registrations must have complete audit trail fields
  if (registration.status === "rejected") {
    TestValidator.predicate(
      "rejected registration has non-null rejectionReason",
      registration.rejectionReason !== null,
    );
    TestValidator.predicate(
      "rejected registration has non-null reviewer",
      registration.reviewer !== null,
    );
    TestValidator.predicate(
      "rejected registration has non-null reviewedAt timestamp",
      registration.reviewedAt !== null,
    );
  }
}
