import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import type { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_files_create } from "../../../generate/generate_random_community_member_files_create";
import { prepare_random_community_file } from "../../../prepare/prepare_random_community_file";

/**
 * Test that soft-deleted files are not accessible through the file retrieval endpoint.
 *
 * Scenario: A member uploads a file, deletes it, and then attempts to retrieve the deleted file.
 *
 * Steps:
 * 1. Register and authenticate as a new member
 * 2. Upload a community icon image (COMMUNITY_ICON type, valid format, within 2MB limit)
 * 3. Store the returned file ID from the upload response
 * 4. Delete the uploaded file using DELETE /community/member/files/{fileId}
 * 5. Attempt to retrieve the deleted file using GET /community/member/files/{fileId} with the same file ID
 * 6. Verify the endpoint returns 404 Not Found
 *
 * This validates the business rule that soft-deleted files (where deleted_at is not null)
 * are excluded from retrieval results. The endpoint should not return file records that have
 * been marked as deleted, ensuring proper data lifecycle management and preventing access
 * to removed content.
 */
export async function test_api_file_retrieval_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Upload a file using the utility function
  const file = await generate_random_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "COMMUNITY_ICON",
        file: "base64-encoded-image-data",
      },
    },
  );
  typia.assert(file);
  // 3. Soft-delete the uploaded file
  await api.functional.community.member.files.erase(memberConnection, {
    fileId: file.id,
  });
  // 4. Attempt to retrieve the deleted file - should return 404
  await TestValidator.httpError(
    "soft-deleted file should not be found",
    404,
    async () => {
      await api.functional.community.member.files.at(memberConnection, {
        fileId: file.id,
      });
    },
  );
}
