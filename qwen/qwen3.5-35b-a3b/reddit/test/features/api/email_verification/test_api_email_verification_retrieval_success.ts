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

export async function test_api_email_verification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (creates email verification record automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a verification ID (in real scenario, this would come from member registration response or separate query)
  // Since the registration API doesn't return verification ID, we generate a random UUID
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the email verification record
  const verification =
    await api.functional.redditCommunity.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate response fields
  TestValidator.equals(
    "verification ID matches request",
    verification.id,
    verificationId,
  );
  TestValidator.predicate(
    "token is present",
    verification.token !== "" && verification.token !== null,
  );
  TestValidator.predicate(
    "expires_at is in future",
    new Date(verification.expires_at) > new Date(),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    verification.created_at !== null && verification.created_at !== "",
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    verification.updated_at !== null && verification.updated_at !== "",
  );
  TestValidator.equals(
    "deleted_at is null (active record)",
    verification.deleted_at,
    null,
  );
  TestValidator.equals(
    "reddit_community_member_id matches registered member",
    verification.reddit_community_member_id,
    member.id,
  );
}