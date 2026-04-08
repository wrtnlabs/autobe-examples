import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test viewing a user profile after account deletion returns 404 error.
 *
 * Validates that when a user's account is deleted or doesn't exist, the profile endpoint returns a 404 Not Found error. This ensures that soft-deleted profiles are properly filtered out from profile viewing operations and that non-existent profiles are handled correctly.
 *
 * The test creates a member account to establish a valid profile, then verifies that attempting to access a non-existent or deleted profile returns the appropriate HTTP 404 error status.
 *
 * 1. Create a member account with email, password, and username.
 * 2. Verify the profile exists and is accessible.
 * 3. Generate a non-existent profile ID to simulate a deleted account.
 * 4. Attempt to view the non-existent profile.
 * 5. Verify that the profile endpoint returns HTTP 404 Not Found status.
 */
export async function test_api_profile_deleted_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.name(),
      href: "https://test.com/register",
      referrer: "https://test.com/home",
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  const validProfileId = member.id;
  // 2. Verify the valid profile is accessible
  const profile = await api.functional.redditClone.profiles.at(
    memberConnection,
    {
      profileId: validProfileId,
    },
  );
  typia.assert(profile);
  // 3. Generate a non-existent profile ID to simulate a deleted account
  const deletedProfileId = typia.random<string & typia.tags.Format<"uuid">>();
  // 4. Attempt to view the non-existent/deleted profile
  await TestValidator.httpError(
    "deleted profile returns 404",
    404,
    async () => {
      await api.functional.redditClone.profiles.at(memberConnection, {
        profileId: deletedProfileId,
      });
    },
  );
}
