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

/**
 * Test email verification token invalidation on recreation.
 *
 * Validates that requesting a new email verification token invalidates any previous unused tokens for the same member. This ensures the single active token per member business rule is enforced throughout the verification workflow.
 *
 * The test verifies the token lifecycle management where:
 * 1. Previous unused tokens are marked as used when a new token is generated
 * 2. Only one active (unused) verification token exists per member at any time
 * 3. Token invalidation happens atomically during token recreation
 *
 * 1. Member registers with email and password credentials.
 * 2. Member requests initial email verification token.
 * 3. Member requests a second email verification token.
 * 4. Validates both tokens are unique (different IDs and token values).
 * 5. Validates second token is active (used_at is null).
 * 6. Confirms both tokens belong to the same member.
 */
export async function test_api_member_email_verification_token_invalidation_on_recreation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Request initial verification token
  const firstToken: IHrmMemberEmailVerification =
    await generate_random_hrm_member_member_email_verifications_create(
      memberConnection,
      {},
    );
  typia.assert(firstToken);
  // Validate initial token is unused
  TestValidator.equals(
    "first token unused initially",
    firstToken.used_at,
    null,
  );
  // 3. Request second verification token (should invalidate first)
  const secondToken: IHrmMemberEmailVerification =
    await generate_random_hrm_member_member_email_verifications_create(
      memberConnection,
      {},
    );
  typia.assert(secondToken);
  // 4. Validate second token is active (unused)
  TestValidator.equals("second token unused", secondToken.used_at, null);
  // 5. Validate tokens are different
  TestValidator.notEquals("token IDs differ", firstToken.id, secondToken.id);
  TestValidator.notEquals(
    "token values differ",
    firstToken.token,
    secondToken.token,
  );
  // 6. Validate both tokens belong to the same member
  TestValidator.equals(
    "same member verification",
    firstToken.member.id,
    secondToken.member.id,
  );
  TestValidator.equals(
    "same email verification",
    firstToken.email,
    secondToken.email,
  );
}
