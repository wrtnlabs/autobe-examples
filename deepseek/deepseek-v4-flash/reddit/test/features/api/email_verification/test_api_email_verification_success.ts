import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joined: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(joined);
  // 2. Verify email using the verification token
  // The verification endpoint is unauthenticated, so use a fresh connection
  const verifyConnection: api.IConnection = { host: connection.host };
  const verification: ICommunityPlatformMemberEmailVerification =
    await api.functional.communityPlatform.member.email_verifications.verify(
      verifyConnection,
      {
        body: {
          token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformMemberEmailVerification.IVerify,
      },
    );
  typia.assert(verification);
  // 3. Validate that the email was successfully verified
  TestValidator.predicate(
    "email verification successful",
    verification.verified_at !== null,
  );
}
