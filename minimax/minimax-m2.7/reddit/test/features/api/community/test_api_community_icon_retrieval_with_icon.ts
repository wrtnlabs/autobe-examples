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

export async function test_api_community_icon_retrieval_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Step 1: Authenticate as a member by joining the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Create a new community with a unique name
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Upload a file to serve as the community icon
  // Create a small valid PNG image (1x1 transparent pixel) in base64
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        file_data: pngBase64,
        mime_type: "image/png",
        original_filename: "test_icon.png",
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(file);
  // Step 4: Create the file association linking the file to the community
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
  // Step 5: Call the target endpoint to retrieve the icon
  const retrievedIcon = await api.functional.redditClone.communities.icons.at(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  typia.assert(retrievedIcon);
  // Step 6: Verify the response contains the icon entity with nested file metadata
  TestValidator.equals("icon id matches", retrievedIcon.id, icon.id);
  TestValidator.equals(
    "icon community name matches",
    retrievedIcon.community.name,
    community.name,
  );
  TestValidator.equals(
    "icon community description matches",
    retrievedIcon.community.description,
    community.description,
  );
  TestValidator.equals("icon file id matches", retrievedIcon.file.id, file.id);
  TestValidator.equals(
    "icon file original filename matches",
    retrievedIcon.file.originalFilename,
    file.originalFilename,
  );
  TestValidator.equals(
    "icon file mime type matches",
    retrievedIcon.file.mimeType,
    file.mimeType,
  );
  TestValidator.equals(
    "icon file status matches",
    retrievedIcon.file.status,
    file.status,
  );
  TestValidator.predicate(
    "icon file size is positive",
    retrievedIcon.file.fileSize > 0,
  );
}
