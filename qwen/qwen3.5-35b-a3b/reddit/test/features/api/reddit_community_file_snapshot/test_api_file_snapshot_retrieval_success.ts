import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileSnapshot";
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

export async function test_api_file_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Upload image file to create file record
  const uploadConnection: api.IConnection = { host: connection.host };
  const file = await generate_random_reddit_community_member_files_create(
    uploadConnection,
    {
      body: {
        file_type: "avatar",
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: "https://example.com/test-image.jpg",
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. List all snapshots for the file to find existing snapshotId
  const listConnection: api.IConnection = { host: connection.host };
  const snapshotList =
    await api.functional.redditCommunity.member.files.snapshots.index(
      listConnection,
      {
        fileId: file.id,
        body: {
          page: 1,
          pageSize: 20,
          sortBy: "snapshot_created_at",
          order: "desc",
        } satisfies IRedditCommunityFileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  // Validate snapshots exist for file
  TestValidator.predicate(
    "snapshots exist for file",
    snapshotList.data.length > 0,
  );
  // 4. Retrieve a specific snapshot
  const snapshotId = snapshotList.data[0].id;
  const retrieveConnection: api.IConnection = { host: connection.host };
  const snapshot =
    await api.functional.redditCommunity.member.files.snapshots.at(
      retrieveConnection,
      {
        fileId: file.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot contains correct references
  TestValidator.equals(
    "snapshot fileId matches uploaded file",
    snapshot.fileId,
    file.id,
  );
  TestValidator.equals(
    "snapshot id matches retrieved id",
    snapshot.id,
    snapshotId,
  );
}
