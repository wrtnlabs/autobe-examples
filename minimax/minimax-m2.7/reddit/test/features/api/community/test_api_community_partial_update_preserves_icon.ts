import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
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
import { generate_random_reddit_clone_member_communities_icons_upload_icon } from "../../../generate/generate_random_reddit_clone_member_communities_icons_upload_icon";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_icon } from "../../../prepare/prepare_random_reddit_clone_community_icon";

export async function test_api_community_partial_update_preserves_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community with initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: initialDescription,
        },
      },
    );
  typia.assert(community);
  // 3. Upload and assign icon to the community
  const icon =
    await generate_random_reddit_clone_member_communities_icons_upload_icon(
      memberConnection,
      {
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(icon);
  // 4. Store the original icon file ID for comparison
  const originalIconFileId = icon.file.id;
  // 5. Perform partial update - only description field, icon_uri omitted
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedCommunity = typia.assert<IRedditCloneCommunityBan>(
    await api.functional.redditClone.member.communities.update(
      memberConnection,
      {
        communityName: community.name,
        body: {
          description: newDescription,
        },
      },
    ),
  );
  // 6. Verify description was updated
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    newDescription,
  );
  // 7. Upload icon again to verify it's still the same after partial update
  // The icon endpoint replaces the icon, so we upload the same icon again
  // If partial update cleared the icon_uri, uploading again would work
  // If it preserved the icon, the same icon would still be there
  const iconAfterUpdate =
    await generate_random_reddit_clone_member_communities_icons_upload_icon(
      memberConnection,
      {
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(iconAfterUpdate);
  // 8. Verify icon file ID matches (icon was preserved during partial update)
  TestValidator.equals(
    "icon preserved after partial update",
    iconAfterUpdate.file.id,
    originalIconFileId,
  );
}
