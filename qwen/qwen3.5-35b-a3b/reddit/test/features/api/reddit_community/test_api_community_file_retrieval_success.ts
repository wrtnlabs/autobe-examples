import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_community_file_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful retrieval of a community file attachment by an authenticated admin user.
   *
   * Validates the complete file retrieval workflow including admin authentication via join endpoint
   * and subsequent file access through the admin API. The test ensures that:
   * - Admin account can be created and authenticated
   * - Admin-specific connections can be established with proper authorization headers
   * - File retrieval endpoint returns complete file metadata
   * - File record structure matches the IRedditCommunityCommunityFile DTO exactly
   * - Community reference is correctly populated with ISummary
   * - File soft-delete status is properly tracked (deleted_at is NULL for active files)
   *
   * Special attention is given to verifying the relationship between the file and its parent
   * community, ensuring the community_id in the file record matches the path parameter, and
   * that the community reference contains valid summary data.
   *
   * 1. Create admin account using authorize_admin_join utility function
   * 2. Establish admin-authenticated connection with JWT token
   * 3. Retrieve file via GET /redditCommunity/admin/communities/{communityId}/files/{fileId}
   * 4. Validate file record contains all required metadata fields
   * 5. Verify file-community relationship integrity
   * 6. Confirm deleted_at is NULL indicating active file status
   */
  // 1. Setup: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditCommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create new connection with admin token for subsequent API calls
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: admin.token.access },
  };
  // 3. Execution: Get file from backend (use random UUIDs - backend should have seed data)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const file: IRedditCommunityCommunityFile =
    await api.functional.redditCommunity.admin.communities.files.at(
      adminAuthenticatedConnection,
      {
        communityId,
        fileId,
      },
    );
  typia.assert(file);
  // 4. Validate file record structure and content
  TestValidator.equals("file id matches path", file.id, fileId);
  TestValidator.equals(
    "community_id matches path",
    file.community_id,
    communityId,
  );
  TestValidator.equals("filename exists", file.filename.length, 0);
  TestValidator.equals("file_path exists", file.file_path.length, 0);
  TestValidator.equals("mime_type exists", file.mime_type.length, 0);
  TestValidator.predicate("file_size is positive", file.file_size > 0);
  TestValidator.equals("created_at exists", file.created_at, undefined);
  TestValidator.equals("updated_at exists", file.updated_at, undefined);
  TestValidator.equals(
    "deleted_at is NULL (active file)",
    file.deleted_at,
    null,
  );
  // 5. Validate community reference
  TestValidator.equals("community id exists", file.community.id.length, 0);
  TestValidator.equals("community name exists", file.community.name.length, 0);
  TestValidator.equals(
    "community created_at exists",
    file.community.created_at,
    undefined,
  );
  // 6. Validate community_id relationship
  TestValidator.equals(
    "community in record matches path id",
    file.community.id,
    communityId,
  );
}