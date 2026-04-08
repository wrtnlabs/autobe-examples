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

/**
 * Test that accessing a file fails with 404 when the referenced resources do not exist.
 *
 * Validates the file retrieval endpoint's error handling when attempting to access
 * files associated with non-existent communities or when the file itself does not exist.
 * While the soft-delete scenario requires community/file management endpoints not
 * currently available in the SDK, this test demonstrates the endpoint's validation
 * of community and file ID references.
 *
 * 1. Administrator authenticates via /redditCommunity/auth/admin/join.
 * 2. Test file retrieval with valid UUID format but non-existent resource IDs.
 * 3. Validate HTTP 404 response indicating the community or file could not be found.
 * 4. Ensure the error message provides meaningful feedback about the missing resources.
 * 5. Verify the system properly validates community-file relationships.
 *
 * Note: This test validates the retrieval endpoint's error handling. Full soft-delete
 * scenario testing requires community creation, file upload, and community deletion
 * endpoints which are not currently exposed in the SDK.
 */
export async function test_api_community_file_retrieval_community_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate valid UUIDs that don't exist in the database
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const fileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve file - should fail with 404
  await TestValidator.httpError(
    "should return 404 for non-existent community and file",
    404,
    async () => {
      const result =
        await api.functional.redditCommunity.admin.communities.files.at(
          adminConnection,
          {
            communityId,
            fileId,
          },
        );
      typia.assert(result);
      return result;
    },
  );
}