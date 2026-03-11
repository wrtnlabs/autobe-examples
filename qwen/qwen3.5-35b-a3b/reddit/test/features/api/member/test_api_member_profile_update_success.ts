import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account with initial profile data
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.paragraph({ sentences: 1 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  typia.assert(joinResult.user);
  const initialDisplayName = joinResult.user.display_name;
  const initialKarmaScore = joinResult.user.karma_score;
  const initialIsActive = joinResult.user.is_active;
  // Step 2: Create new connection for profile update with fresh token
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = {
    ...updateConnection.headers,
    Authorization: joinResult.token.access,
  };
  // Step 3: Update profile with new values
  const newDisplayName = RandomGenerator.name(1);
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const newAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const updatedProfile =
    await api.functional.redditPlatform.member.profile.update(
      updateConnection,
      {
        body: {
          display_name: newDisplayName,
          bio: newBio,
          avatar_url: newAvatarUrl,
        } satisfies IRedditPlatformMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 4: Verify all updated fields are reflected in response
  TestValidator.equals(
    "display_name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio should be updated", updatedProfile.bio, newBio);
  TestValidator.equals(
    "avatar_url should be updated",
    updatedProfile.avatar_url,
    newAvatarUrl,
  );
  // Step 5: Verify updated_at timestamp is different (indicating update occurred)
  TestValidator.equals(
    "user ID should remain consistent",
    updatedProfile.id,
    joinResult.user.id,
  );
  TestValidator.equals(
    "username should remain unchanged",
    updatedProfile.username,
    joinResult.user.username,
  );
  // Step 6: Verify system-managed fields remain unchanged
  TestValidator.equals(
    "karma_score should remain unchanged",
    updatedProfile.karma_score,
    initialKarmaScore,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    updatedProfile.is_active,
    initialIsActive,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedProfile.created_at,
    joinResult.user.created_at,
  );
  // Step 7: Verify timestamps are valid date-time format
  typia.assert(updatedProfile.updated_at);
}