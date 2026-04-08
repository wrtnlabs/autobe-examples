import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityFile";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_files_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create test data - list files for a community
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fileList =
    await api.functional.redditCommunity.admin.communities.files.index(
      adminConnection,
      {
        communityId: testCommunityId,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCommunityCommunityFile.IRequest,
      },
    );
  typia.assert(fileList);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    fileList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", fileList.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    fileList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    fileList.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    fileList.pagination.pages,
    Math.ceil(fileList.pagination.records / fileList.pagination.limit),
  );
  // 4. Validate file records if any exist
  if (fileList.data.length > 0) {
    const firstFile = fileList.data[0];
    typia.assert(firstFile);
    // Validate file metadata fields exist and are valid
    TestValidator.predicate("file id is not empty", firstFile.id.length > 0);
    TestValidator.predicate(
      "file path is not empty",
      firstFile.file_path.length > 0,
    );
    TestValidator.predicate(
      "filename is not empty",
      firstFile.filename.length > 0,
    );
    TestValidator.predicate(
      "mime type is not empty",
      firstFile.mime_type.length > 0,
    );
    TestValidator.predicate("file size is valid", firstFile.file_size >= 0);
    TestValidator.predicate(
      "created_at is valid datetime",
      firstFile.created_at.length > 0,
    );
    // Validate community reference exists and contains required fields
    typia.assert(firstFile.community);
    TestValidator.predicate(
      "community id is not empty",
      firstFile.community.id.length > 0,
    );
    TestValidator.predicate(
      "community name is not empty",
      firstFile.community.name.length > 0,
    );
    TestValidator.predicate(
      "community created_at is valid datetime",
      firstFile.community.created_at.length > 0,
    );
    // Validate sorting order (newest first by created_at)
    if (fileList.data.length > 1) {
      for (let i = 1; i < fileList.data.length; i++) {
        const prevFile = fileList.data[i - 1];
        const currFile = fileList.data[i];
        TestValidator.predicate(
          `file ${i} is sorted after file ${i - 1}`,
          prevFile.created_at >= currFile.created_at,
        );
      }
    }
  }
  // 5. Validate soft-delete exclusion (no deleted_at should be present)
  if (fileList.data.length > 0) {
    for (const file of fileList.data) {
      TestValidator.predicate(
        "file community has no deleted_at",
        file.community.deleted_at === undefined ||
          file.community.deleted_at === null,
      );
    }
  }
}
