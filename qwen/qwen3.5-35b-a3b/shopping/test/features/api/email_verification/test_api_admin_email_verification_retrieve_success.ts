import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_email_verification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system to establish authenticated session
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate a valid verification ID (UUID format)
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve email verification record using admin connection
  const verification =
    await api.functional.ecommerceMall.admin.email_verifications.at(
      adminConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Verify response contains all required fields
  TestValidator.equals(
    "verification id matches",
    verification.id,
    verificationId,
  );
  TestValidator.predicate(
    "customer id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(verification.customerId),
  );
  TestValidator.predicate(
    "token is non-empty string",
    verification.token.length > 0,
  );
  TestValidator.predicate(
    "expiresAt is valid ISO datetime",
    !isNaN(Date.parse(verification.expiresAt)),
  );
  TestValidator.predicate(
    "createdAt is valid ISO datetime",
    !isNaN(Date.parse(verification.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO datetime",
    !isNaN(Date.parse(verification.updatedAt)),
  );
  TestValidator.predicate(
    "deletedAt is null or valid datetime",
    verification.deletedAt === null ||
      !isNaN(Date.parse(verification.deletedAt)),
  );
  TestValidator.predicate(
    "usedAt is null or valid datetime",
    verification.usedAt === null || !isNaN(Date.parse(verification.usedAt)),
  );
}
