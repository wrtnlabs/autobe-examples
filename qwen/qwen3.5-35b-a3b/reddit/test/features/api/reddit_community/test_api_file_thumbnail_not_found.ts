import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileThumbnail";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

export async function test_api_file_thumbnail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth: Register member and get access token
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResponse);
  // 2. Resource Creation: Upload file to get fileId
  const fileResponse =
    await generate_random_reddit_community_member_files_create(
      memberConnection,
      {
        body: {
          file_type: "post",
          owner_id: typia.random<string & tags.Format<"uuid">>(),
          file_uri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityFile.ICreate,
      },
    );
  typia.assert(fileResponse);
  const fileId = fileResponse.id;
  // 3. Enumerate: Get list of existing thumbnails for this file
  const thumbnailsList =
    await api.functional.redditCommunity.files.thumbnails.index(
      memberConnection,
      {
        fileId,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(thumbnailsList);
  // Collect existing thumbnail IDs to ensure we use a different one for the error test
  const existingThumbnailIds = new Set(thumbnailsList.data.map((t) => t.id));
  // Generate a non-existent thumbnail ID (different from any existing)
  let nonExistentThumbnailId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  while (existingThumbnailIds.has(nonExistentThumbnailId)) {
    nonExistentThumbnailId = typia.random<string & tags.Format<"uuid">>();
  }
  // 4. Error Case: Attempt to retrieve non-existent thumbnail
  await TestValidator.error(
    "should return 404 for non-existent thumbnail",
    async () => {
      await api.functional.redditCommunity.files.thumbnails.at(
        memberConnection,
        {
          fileId,
          thumbnailId: nonExistentThumbnailId,
        },
      );
    },
  );
}
