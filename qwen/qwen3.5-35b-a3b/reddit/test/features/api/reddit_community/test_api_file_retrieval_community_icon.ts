import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_file_retrieval_community_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Upload community icon file
  // Note: We use a generated community UUID as owner_id since community creation is not available
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const file = await api.functional.redditCommunity.member.files.create(
    memberConnection,
    {
      body: {
        file_type: "community_icon",
        owner_id: communityId,
        file_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  const fileId = file.id;
  // 3. Retrieve file
  const retrieved = await api.functional.redditCommunity.files.at(
    memberConnection,
    {
      fileId: fileId,
    },
  );
  typia.assert(retrieved);
  // 4. Validate file metadata
  TestValidator.equals("file id matches request", retrieved.id, fileId);
  TestValidator.equals(
    "file type is community_icon",
    retrieved.fileType,
    "community_icon",
  );
  TestValidator.notEquals("has original name", retrieved.originalName, null);
  TestValidator.notEquals("has file name", retrieved.fileName, null);
  TestValidator.predicate(
    "file path is valid URI",
    /^https?:\/\//.test(retrieved.filePath),
  );
  TestValidator.notEquals("has mime type", retrieved.mimeType, null);
  TestValidator.predicate(
    "has file size",
    retrieved.fileSize !== undefined && retrieved.fileSize !== null,
  );
  TestValidator.notEquals("has created at", retrieved.createdAt, null);
  TestValidator.notEquals("has updated at", retrieved.updatedAt, null);
  TestValidator.equals("file is active", retrieved.deletedAt, null);
  TestValidator.predicate(
    "has community icon relationship",
    retrieved.communityIcon !== null,
  );
}
