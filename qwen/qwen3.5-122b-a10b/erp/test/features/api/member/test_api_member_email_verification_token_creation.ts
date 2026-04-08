import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_member_email_verifications_create } from "../../../generate/generate_random_hrm_member_member_email_verifications_create";
import { prepare_random_hrm_member_email_verification } from "../../../prepare/prepare_random_hrm_member_email_verification";

export async function test_api_member_email_verification_token_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Request email verification token creation
  const verification: IHrmMemberEmailVerification =
    await generate_random_hrm_member_member_email_verifications_create(
      memberConnection,
      {},
    );
  typia.assert(verification);
  // 3. Validate response structure
  TestValidator.equals(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      verification.id,
    ),
    true,
  );
  TestValidator.predicate(
    "token length >= 32",
    verification.token.length >= 32,
  );
  TestValidator.equals("email matches", verification.email, auth.email);
  TestValidator.equals("used_at is null", verification.used_at, null);
  TestValidator.equals("deleted_at is null", verification.deleted_at, null);
  TestValidator.equals("member id matches", verification.member.id, auth.id);
  TestValidator.equals(
    "member email matches",
    verification.member.email,
    auth.email,
  );
  // 4. Validate expiration time (approximately 24 hours from created_at)
  const created = new Date(verification.created_at);
  const expires = new Date(verification.expires_at);
  const expectedExpiration = new Date(created.getTime() + 24 * 60 * 60 * 1000);
  const timeDiff = Math.abs(expires.getTime() - expectedExpiration.getTime());
  TestValidator.predicate(
    "expires_at is approximately 24 hours from created_at",
    timeDiff < 60 * 1000,
  );
}
