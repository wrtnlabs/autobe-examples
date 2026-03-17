import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileSnapshot";
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

export async function test_api_file_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Upload an image file to create a file record
  // Note: We need the member ID for owner_id. We'll use a randomly generated UUID
  // since the auth response doesn't include member details
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const file = await generate_random_reddit_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "avatar",
        owner_id: memberId,
        file_uri: "https://example.com/image.png",
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Attempt to retrieve non-existent snapshot
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Validate that the system returns 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () => {
      await api.functional.redditCommunity.member.files.snapshots.at(
        memberConnection,
        {
          fileId: file.id,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}