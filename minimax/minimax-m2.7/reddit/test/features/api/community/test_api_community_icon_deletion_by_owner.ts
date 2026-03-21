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
import { generate_random_reddit_clone_member_communities_icons_upload_icon } from "../../../generate/generate_random_reddit_clone_member_communities_icons_upload_icon";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_icon } from "../../../prepare/prepare_random_reddit_clone_community_icon";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_community_icon_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Upload a valid image file to be used as community icon
  // Create a small valid PNG image (1x1 pixel transparent PNG)
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        file_data: pngBase64,
        mime_type: "image/png",
        original_filename: "test-icon.png",
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(file);
  // 4. Verify the file has 'processed' status after virus scanning
  TestValidator.equals("file status is processed", file.status, "processed");
  // 5. Associate the uploaded image as the community icon
  const icon =
    await generate_random_reddit_clone_member_communities_icons_upload_icon(
      memberConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          iconFileId: file.id,
        },
      },
    );
  typia.assert(icon);
  // 6. Delete the icon using the erase endpoint
  await api.functional.redditClone.member.communities.icons.erase(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  // 7. Verify attempting to delete again returns 404 (icon no longer exists)
  await TestValidator.httpError(
    "icon deletion returns 404 after deletion",
    404,
    async () => {
      await api.functional.redditClone.member.communities.icons.erase(
        memberConnection,
        {
          communityName: community.name,
        },
      );
    },
  );
}
