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

export async function test_api_community_icon_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registers and authenticates via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Member creates a community without an initial icon
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Member uploads an image file that gets processed
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(uploadedFile);
  // 4. Member updates the community icon using the processed file's ID
  const updatedCommunity =
    await api.functional.redditClone.member.communities.icon.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          fileId: uploadedFile.id,
        } satisfies IRedditCloneCommunityIcon.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 5. Validate response returns the updated community with the new icon details
  TestValidator.equals(
    "community id matches",
    updatedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    updatedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    updatedCommunity.description,
    community.description,
  );
  // Validate icon details
  TestValidator.equals(
    "icon exists",
    updatedCommunity.icon !== null && updatedCommunity.icon !== undefined,
    true,
  );
  if (updatedCommunity.icon) {
    TestValidator.equals(
      "icon file id matches",
      updatedCommunity.icon.file.id,
      uploadedFile.id,
    );
    TestValidator.equals(
      "icon original filename matches",
      updatedCommunity.icon.file.originalFilename,
      uploadedFile.originalFilename,
    );
    TestValidator.equals(
      "icon mime type matches",
      updatedCommunity.icon.file.mimeType,
      uploadedFile.mimeType,
    );
    TestValidator.equals(
      "icon file size matches",
      updatedCommunity.icon.file.fileSize,
      uploadedFile.fileSize,
    );
    TestValidator.predicate(
      "icon community id matches",
      updatedCommunity.icon.community.id === community.id,
    );
  }
}
