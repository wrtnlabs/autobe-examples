import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a newly created member has an initial karma score of zero.
 *
 * 1. Authenticate as a new member using authorize_member_join utility function
 * 2. Call GET /communityPlatform/member/karma to retrieve the member's karma score
 * 3. Verify the response contains a karma record with score equal to 0
 * 4. Confirm the karma record includes proper member association via member.id matching authenticated member
 * 5. Validate the response includes timestamps (created_at, updated_at) and deleted_at null
 * 6. Ensure the karma score is an integer type and member object matches authenticated user identity
 */
export async function test_api_karma_initial_score_zero(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member using utility function (MUST use utility, not SDK directly)
  const memberAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // Create member-specific connection with authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // Retrieve karma score using SDK function (no utility available for this endpoint)
  const karma =
    await api.functional.communityPlatform.member.karma.at(memberConnection);
  typia.assert(karma);
  // Validate initial karma score is 0
  TestValidator.equals("karma score should be 0 initially", karma.score, 0);
  // Validate member association matches authenticated member
  TestValidator.equals(
    "karma member ID should match authenticated member ID",
    karma.member.id,
    memberAuth.id,
  );
  // Validate deleted_at is null (active record)
  TestValidator.equals("deleted_at should be null", karma.deleted_at, null);
}
