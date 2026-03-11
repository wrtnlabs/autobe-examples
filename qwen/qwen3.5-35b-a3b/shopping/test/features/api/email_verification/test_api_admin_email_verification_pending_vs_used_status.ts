import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_admin_email_verification_pending_vs_used_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and creates pending email verification (usedAt = null)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies DeepPartial<IEcommerceMallCustomer.IJoin>,
  });
  typia.assert(customerResult);
  // 2. Seller joins and creates email verification
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies DeepPartial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(sellerResult);
  // 3. Admin joins to create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: adminPassword,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies DeepPartial<IEcommerceMallAdmin.IJoin>,
  });
  typia.assert(adminJoinResult);
  // 4. Admin logs in to establish authenticated session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 5. Generate mock pending verification record (usedAt = null)
  const pendingVerification =
    typia.random<IEcommerceMallCustomerEmailVerification>();
  typia.assert(pendingVerification);
  const pendingVerificationId = pendingVerification.id;
  typia.assert(pendingVerification.usedAt === null);
  const pendingExpiresAt = new Date(pendingVerification.expiresAt);
  TestValidator.predicate(
    "pending verification expires in future",
    pendingExpiresAt > new Date(),
  );
  // 6. Generate mock used verification record (usedAt = past timestamp)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const usedVerification = {
    ...typia.random<IEcommerceMallCustomerEmailVerification>(),
    usedAt: pastDate.toISOString(),
    customerId: pendingVerification.customerId,
  } satisfies IEcommerceMallCustomerEmailVerification;
  typia.assert(usedVerification);
  const usedVerificationId = usedVerification.id;
  typia.assert(usedVerification.usedAt !== null);
  const usedAtDate = new Date(usedVerification.usedAt);
  TestValidator.predicate(
    "used verification usedAt is in the past",
    usedAtDate < new Date(),
  );
  // 7. Retrieve and validate pending verification
  const retrievedPending =
    await api.functional.ecommerceMall.admin.email_verifications.at(
      adminConnection,
      { verificationId: pendingVerificationId },
    );
  typia.assert(retrievedPending);
  TestValidator.equals(
    "pending verification has null usedAt",
    retrievedPending.usedAt,
    null,
  );
  const pendingRetrievedExpires = new Date(retrievedPending.expiresAt);
  TestValidator.predicate(
    "pending verification retrieved expires in future",
    pendingRetrievedExpires > new Date(),
  );
  // 8. Retrieve and validate used verification
  const retrievedUsed =
    await api.functional.ecommerceMall.admin.email_verifications.at(
      adminConnection,
      { verificationId: usedVerificationId },
    );
  typia.assert(retrievedUsed);
  TestValidator.predicate(
    "used verification has non-null usedAt",
    retrievedUsed.usedAt !== null,
  );
  TestValidator.predicate(
    "used verification usedAt is not in future",
    retrievedUsed.usedAt !== null &&
      new Date(retrievedUsed.usedAt) <= new Date(),
  );
  const retrievedUsedAtDate =
    retrievedUsed.usedAt !== null ? new Date(retrievedUsed.usedAt) : new Date();
  const retrievedUsedExpires = new Date(retrievedUsed.expiresAt);
  TestValidator.predicate(
    "used verification usedAt is before expiresAt",
    retrievedUsedAtDate < retrievedUsedExpires,
  );
}
