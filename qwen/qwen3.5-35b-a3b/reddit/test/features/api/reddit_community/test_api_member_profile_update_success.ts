import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Capture original profile's updated_at before update
  const originalProfile =
    await api.functional.redditCommunity.member.profile.update(
      member1Connection,
      {
        body: {} satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(originalProfile);
  const originalUpdatedAt = originalProfile.updated_at;
  // 3. Update member1's profile with new display_name and bio
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile =
    await api.functional.redditCommunity.member.profile.update(
      member1Connection,
      {
        body: {
          display_name: newDisplayName,
          bio: newBio,
        } satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate updated profile contains new values
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  // Verify updated_at changed from original (reflects the update)
  TestValidator.notEquals(
    "updated_at changed after update",
    originalUpdatedAt,
    updatedProfile.updated_at,
  );
  // Verify updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    () =>
      new Date(updatedProfile.updated_at).getTime() >
      new Date(updatedProfile.created_at).getTime(),
  );
  // 5. Validate all required profile fields are present and valid
  TestValidator.equals(
    "profile id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(updatedProfile.id),
    true,
  );
  TestValidator.equals(
    "user username exists",
    updatedProfile.user.username.length > 0,
    true,
  );
  TestValidator.equals(
    "display_name exists",
    updatedProfile.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "karma score is number",
    typeof updatedProfile.karma.current_score === "number",
    true,
  );
  TestValidator.equals(
    "posts pagination has data",
    Array.isArray(updatedProfile.posts.data),
    true,
  );
  TestValidator.equals(
    "comments pagination has data",
    Array.isArray(updatedProfile.comments.data),
    true,
  );
  TestValidator.equals(
    "profile is active (not deleted)",
    updatedProfile.deleted_at === null,
    true,
  );
}
