import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
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
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_community_icon_update_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register memberA (community owner) and create a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 2. Register memberB (non-owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuthorized);
  // 3. Upload an image file as memberB to get a valid file URI
  const file = await generate_random_reddit_clone_member_files_create(
    memberBConnection,
    {
      body: {
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(file);
  // 4. Attempt to update memberA's community icon as memberB - should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-owner should not be able to update community icon",
    403,
    async () =>
      await api.functional.redditClone.member.communities.icons.update(
        memberBConnection,
        {
          communityName: community.name,
          body: {
            fileUri: `file:///redditClone/member/files/${file.id}`,
          } satisfies IRedditCloneCommunityIcon.IUpdate,
        },
      ),
  );
}
