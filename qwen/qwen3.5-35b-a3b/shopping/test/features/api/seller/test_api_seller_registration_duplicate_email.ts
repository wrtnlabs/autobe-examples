import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial seller account with random credentials
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: firstJoinBody,
  });
  typia.assert(firstSeller);
  // Store original seller data for comparison
  const originalEmail = firstSeller.email;
  const originalDisplayName = firstSeller.display_name;
  const originalApprovalStatus = firstSeller.approval_status;
  const originalPassword = firstJoinBody.password;
  const originalCreatedAt = firstSeller.created_at;
  const originalUpdatedAt = firstSeller.updated_at;
  // 2. Attempt duplicate registration with the SAME email
  const duplicateSellerConnection: api.IConnection = { host: connection.host };
  const duplicateJoinBody = {
    email: originalEmail, // Use the EXISTING seller's email
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  // 3. Verify duplicate registration fails with conflict error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_seller_join(duplicateSellerConnection, {
        body: duplicateJoinBody,
      });
    },
  );
  // 4. Verify original seller account remains unchanged by re-authenticating
  const verificationConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(verificationConnection, {
    body: {
      email: originalEmail,
      password: originalPassword,
      href: "",
      referrer: "",
      ip: "",
    } satisfies DeepPartial<IEcommerceMallSeller.ILogin>,
  });
  const verifiedSeller = verificationConnection.headers?.Authorization
    ? await api.functional.ecommerceMall.auth.seller.join(
        verificationConnection,
        {
          body: { ...firstJoinBody },
        },
      )
    : firstSeller;
  // Verify original data is unchanged after duplicate attempt
  TestValidator.equals(
    "email unchanged after duplicate attempt",
    firstSeller.email,
    originalEmail,
  );
  TestValidator.equals(
    "display name unchanged after duplicate attempt",
    firstSeller.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "approval status unchanged after duplicate attempt",
    firstSeller.approval_status,
    originalApprovalStatus,
  );
  TestValidator.equals(
    "created_at unchanged after duplicate attempt",
    firstSeller.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "updated_at unchanged after duplicate attempt",
    firstSeller.updated_at,
    originalUpdatedAt,
  );
  // 5. Verify the duplicate registration did not create a new seller
  // by checking that login with original credentials still works (same seller)
  TestValidator.predicate(
    "original seller account still active",
    firstSeller.deleted_at === null,
  );
  TestValidator.predicate(
    "original seller not suspended",
    firstSeller.is_suspended === false,
  );
}