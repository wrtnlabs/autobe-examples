import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

export async function test_api_moderator_listing_with_owner_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new community with unique name
  const uniqueName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: uniqueName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Call PATCH /redditClone/communities/{communityName}/moderators with no filters
  const moderatorPage =
    await api.functional.redditClone.communities.moderators.index(
      memberConnection,
      {
        communityName: community.name,
        body: {},
      },
    );
  typia.assert(moderatorPage);
  // 4. Validate response contains exactly 1 moderator
  TestValidator.equals("records count", moderatorPage.pagination.records, 1);
  TestValidator.equals("pages count", moderatorPage.pagination.pages, 1);
  TestValidator.equals("data length", moderatorPage.data.length, 1);
  // 5. Verify moderator has role='owner'
  const moderator = moderatorPage.data[0];
  TestValidator.equals("role is owner", moderator.role, "owner");
  // 6. Verify owner details include correct member ID and username
  TestValidator.equals("member id matches", moderator.member.id, authorized.id);
  TestValidator.equals(
    "username matches",
    moderator.member.username,
    authorized.username,
  );
  // 7. Verify assigner is null (self-assigned on community creation)
  TestValidator.equals("assigner is null", moderator.assigner, null);
}
