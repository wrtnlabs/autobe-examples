import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_email_verification_resend_already_verified(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate with email verification already completed
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Join member - this will complete email verification
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: { email, password } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Call the resend endpoint using the authenticated connection
  // This should return 200 OK without sending email or resetting token
  await api.functional.communityPlatform.member.auth.members.email.resend(
    memberConnection,
  );
  // Step 3: Validate successful response (no error thrown)
  // No response body, so we just affirm success
}
