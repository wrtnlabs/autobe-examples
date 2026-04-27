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

export async function test_api_email_verification_already_consumed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account which generates a pending email verification record
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Generate the verification token body to use for both verification attempts
  const verificationBody =
    typia.random<ICommunityPlatformMemberEmailVerification.IVerify>();
  // 3. First verification attempt — should succeed, consuming the token
  const firstVerification: ICommunityPlatformMemberEmailVerification =
    await api.functional.communityPlatform.member.email_verifications.verify(
      connection,
      {
        body: verificationBody,
      },
    );
  typia.assert(firstVerification);
  // 4. Second verification attempt with the same token — should fail with 409 Conflict
  await TestValidator.httpError(
    "reusing consumed email verification token",
    409,
    async () => {
      await api.functional.communityPlatform.member.email_verifications.verify(
        connection,
        {
          body: verificationBody,
        },
      );
    },
  );
}
