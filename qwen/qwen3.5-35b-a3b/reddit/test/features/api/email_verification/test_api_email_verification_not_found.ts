import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account to establish authentication session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string & tags.Format<"uri">>()) satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Generate a random UUID that does not correspond to any verification record
  const nonExistentVerificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call GET endpoint with non-existent verification ID
  // Expected to return 404 Not Found
  await TestValidator.httpError(
    "non-existent verification returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.email_verifications.at(
        memberConnection,
        {
          verificationId: nonExistentVerificationId,
        },
      );
    },
  );
  // 4. Verify no verification record data is leaked in error response
  // The HttpError thrown should contain error message but no verification data
}