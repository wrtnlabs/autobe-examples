import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Retrieve the email verification record
  // Note: In simulation mode, the endpoint returns random data
  // In production, the verification record would be created during registration
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const verification: IRedditLikeMemberEmailVerification =
    await api.functional.redditLike.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 3. Validate business logic - verification record consistency
  TestValidator.equals(
    "verification ID is valid UUID",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "member ID matches",
    verification.reddit_like_member_id,
    member.id,
  );
  TestValidator.equals("email matches", verification.email, member.email);
  // 4. Validate member summary object consistency
  TestValidator.equals(
    "member summary ID matches",
    verification.member.id,
    member.id,
  );
  TestValidator.equals(
    "member summary username matches",
    verification.member.username,
    member.username,
  );
}
