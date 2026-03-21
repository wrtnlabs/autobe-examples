import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
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
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_file_association_create_ownership_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Member A uploads a file
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberAConnection,
    {
      body: {
        target_type: "user",
        target_id: memberA.id,
      },
    },
  );
  typia.assert(uploadedFile);
  // 3. Verify the uploaded file has status 'processed'
  TestValidator.equals(
    "file status is processed",
    uploadedFile.status,
    "processed",
  );
  // 4. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 5. Member B creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberBConnection,
      {},
    );
  typia.assert(community);
  // 6. Member B attempts to create file association using member A's file ID
  // This should fail because the file was uploaded by member A, not member B
  await TestValidator.error(
    "member B cannot associate member A's file",
    async () => {
      await generate_random_reddit_clone_member_file_associations_create(
        memberBConnection,
        {
          body: {
            redditCloneFileId: uploadedFile.id,
            targetId: community.id,
            targetType: "community",
          },
        },
      );
    },
  );
  // 7. Verify member B can still create file association with their own file
  const memberBFile = await generate_random_reddit_clone_member_files_create(
    memberBConnection,
    {
      body: {
        target_type: "user",
        target_id: memberB.id,
      },
    },
  );
  typia.assert(memberBFile);
  // Member B can associate their own file successfully
  const ownFileAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberBConnection,
      {
        body: {
          redditCloneFileId: memberBFile.id,
          targetId: community.id,
          targetType: "community",
        },
      },
    );
  typia.assert(ownFileAssociation);
  TestValidator.equals(
    "file association uploader is member B",
    ownFileAssociation.file.uploader.id,
    memberB.id,
  );
}
