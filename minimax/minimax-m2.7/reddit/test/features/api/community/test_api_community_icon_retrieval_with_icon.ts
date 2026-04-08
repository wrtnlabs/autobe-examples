import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

export async function test_api_community_icon_retrieval_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload an image file to use as community icon
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(uploadedFile);
  // 3. Create a community with the uploaded icon
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          ...prepare_random_reddit_clone_community({}),
          icon: uploadedFile,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Retrieve the community icon
  const iconRecord = await api.functional.redditClone.communities.icon.at(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(iconRecord);
  // 5. Validate response structure
  TestValidator.equals("icon id exists", iconRecord.id !== null, true);
  TestValidator.equals(
    "icon createdAt exists",
    iconRecord.createdAt !== null,
    true,
  );
  TestValidator.equals(
    "community context exists",
    iconRecord.community !== null,
    true,
  );
  TestValidator.equals(
    "community id matches",
    iconRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    iconRecord.community.name,
    community.name,
  );
  TestValidator.equals("file metadata exists", iconRecord.file !== null, true);
  TestValidator.equals(
    "file originalFilename exists",
    iconRecord.file.originalFilename !== null,
    true,
  );
  TestValidator.equals(
    "file mimeType exists",
    iconRecord.file.mimeType !== null,
    true,
  );
  TestValidator.equals(
    "file fileSize exists",
    iconRecord.file.fileSize !== null,
    true,
  );
}
