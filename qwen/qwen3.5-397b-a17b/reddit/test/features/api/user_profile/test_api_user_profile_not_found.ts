import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that viewing a non-existent user's profile returns 404.
 *
 * This test validates that the system properly handles requests for
 * member profiles that do not exist. When a valid UUID format is provided
 * but no corresponding member record exists, the API should return a 404
 * error rather than exposing information about whether the ID format is valid.
 *
 * Test flow:
 * 1. Authenticate as a member to have a valid session
 * 2. Generate a random UUID that doesn't correspond to any existing member
 * 3. Attempt to fetch the profile for the non-existent member
 * 4. Verify that the API returns 404 HTTP error
 */
export async function test_api_user_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Generate a valid UUID that doesn't exist in the database
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to fetch profile for non-existent member
  // 4. Validate that 404 error is returned
  await TestValidator.httpError(
    "non-existent member profile returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.members.profile.at(
        memberConnection,
        {
          memberId: nonExistentMemberId,
        },
      );
    },
  );
}
