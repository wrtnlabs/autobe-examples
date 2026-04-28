import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_profile_create } from "../../../generate/generate_random_reddit_like_community_member_profile_create";
import { prepare_random_reddit_like_community_profile } from "../../../prepare/prepare_random_reddit_like_community_profile";
import { prepare_random_reddit_like_community_profile_image } from "../../../prepare/prepare_random_reddit_like_community_profile_image";

export async function test_api_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate the member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // 2. Create/Initialize profile
  const profile =
    await api.functional.redditLikeCommunity.member.profile.create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(profile);
  // 3. Update profile with display_name and bio
  const updateBody = {
    display_name: "UpdatedDisplay" + RandomGenerator.alphabets(5),
    bio: "Updated bio text " + RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IREdditLikeCommunityProfile.IUpdate;
  const updatedProfile =
    await api.functional.redditLikeCommunity.members.profiles.update(
      memberConnection,
      {
        memberId: member.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate update
  TestValidator.equals(
    "display_name matches",
    updatedProfile.display_name,
    updateBody.display_name,
  );
  TestValidator.equals("bio matches", updatedProfile.bio, updateBody.bio);
  TestValidator.predicate(
    "updated_at refreshed",
    Date.parse(updatedProfile.updated_at) >= Date.parse(profile.updated_at),
  );
}
