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

export async function test_api_file_snapshots_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // Create member-specific connection with token
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResponse.token.access },
  };
  // 2. Upload an image file to create baseline record
  const file = await generate_random_reddit_community_member_files_create(
    authenticatedMemberConnection,
    {
      body: {
        file_type: "avatar" as const,
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        file_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(file);
  // 3. Retrieve snapshot list for the file
  const snapshotResponse =
    await api.functional.redditCommunity.member.files.snapshots.index(
      authenticatedMemberConnection,
      {
        fileId: file.id,
        body: {
          page: 1,
          pageSize: 20,
        } satisfies IRedditCommunityFileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination pages",
    snapshotResponse.pagination.pages,
    Math.ceil(
      snapshotResponse.pagination.records / snapshotResponse.pagination.limit,
    ),
  );
  // 5. Validate data array structure and sorting
  if (snapshotResponse.data.length > 0) {
    // Check sorting: newest first by default (snapshot_created_at DESC)
    for (let i = 1; i < snapshotResponse.data.length; i++) {
      const prevSnapshot = snapshotResponse.data[i - 1];
      const currSnapshot = snapshotResponse.data[i];
      TestValidator.predicate(
        "snapshot order descending by snapshot_created_at",
        new Date(prevSnapshot.snapshot_created_at).getTime() >
          new Date(currSnapshot.snapshot_created_at).getTime(),
      );
    }
    // Validate each snapshot has all required fields
    for (const snapshot of snapshotResponse.data) {
      // Check required snapshot fields
      TestValidator.notEquals(
        "snapshot id exists",
        snapshot.id,
        null as unknown as string,
      );
      TestValidator.notEquals(
        "snapshot_created_at exists",
        snapshot.snapshot_created_at,
        null as unknown as string,
      );
      TestValidator.notEquals(
        "created_at exists",
        snapshot.created_at,
        null as unknown as string,
      );
      TestValidator.notEquals(
        "updated_at exists",
        snapshot.updated_at,
        null as unknown as string,
      );
      // Validate nested file object
      TestValidator.notEquals(
        "file object exists",
        snapshot.file,
        null as unknown as IRedditCommunityFile.ISummary,
      );
      TestValidator.notEquals(
        "file mimeType exists",
        snapshot.file.mimeType,
        null as unknown as string,
      );
      TestValidator.notEquals(
        "file filePath exists",
        snapshot.file.filePath,
        null as unknown as string,
      );
      // Validate datetime formats (ISO 8601)
      TestValidator.predicate(
        "snapshot_created_at is valid ISO 8601",
        () => !isNaN(new Date(snapshot.snapshot_created_at).getTime()),
      );
      TestValidator.predicate(
        "created_at is valid ISO 8601",
        () => !isNaN(new Date(snapshot.created_at).getTime()),
      );
      TestValidator.predicate(
        "updated_at is valid ISO 8601",
        () => !isNaN(new Date(snapshot.updated_at).getTime()),
      );
    }
  }
  // 6. Validate file object structure when data exists
  if (snapshotResponse.data.length > 0) {
    const firstSnapshot = snapshotResponse.data[0];
    typia.assert(firstSnapshot.file);
    // Validate file fields from IRedditCommunityFile.ISummary
    TestValidator.notEquals(
      "file id is UUID",
      firstSnapshot.file.id,
      null as unknown as string,
    );
    TestValidator.notEquals(
      "file fileType exists",
      firstSnapshot.file.fileType,
      null as unknown as "user_avatar" | "post_image" | "community_icon",
    );
    TestValidator.notEquals(
      "file mimeType exists",
      firstSnapshot.file.mimeType,
      null as unknown as string,
    );
    TestValidator.notEquals(
      "file filePath exists",
      firstSnapshot.file.filePath,
      null as unknown as string,
    );
    TestValidator.notEquals(
      "file createdAt exists",
      firstSnapshot.file.createdAt,
      null as unknown as string,
    );
  }
}