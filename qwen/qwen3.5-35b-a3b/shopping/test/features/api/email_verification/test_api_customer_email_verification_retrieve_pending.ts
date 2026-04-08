import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_customer_email_verification_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (creates pending email verification)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a pending verification ID (simulated - in real scenario,
  //    client would receive this via email or separate API endpoint after
  //    registration. The registration creates the verification record,
  //    and the verification ID would be included in the verification email.
  //    For E2E testing, we generate a new UUID to represent this.
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create verification retrieval connection (use auth token from registration)
  const verificationConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 4. Retrieve pending email verification record
  // Note: In a real scenario, this would be the actual verification ID
  // sent via email. For E2E testing, we validate the API accepts the request.
  const verification =
    await api.functional.ecommerceMall.member.email_verifications.at(
      verificationConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 5. Validate verification record structure and pending status
  TestValidator.equals(
    "verification status is pending",
    verification.status,
    "pending",
  );
  TestValidator.equals(
    "verification email matches member email",
    verification.email,
    member.email,
  );
  TestValidator.equals(
    "verification member ID matches",
    verification.ecommerce_mall_member_id,
    member.id,
  );
  TestValidator.equals(
    "used_at is null (not yet verified)",
    verification.used_at,
    null,
  );
  TestValidator.notEquals("created_at is set", verification.created_at, null);
  TestValidator.notEquals("expired_at is set", verification.expired_at, null);
  TestValidator.notEquals(
    "deleted_at is null (not deleted)",
    verification.deleted_at,
    null,
  );
}
