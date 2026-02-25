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
 * Test file deletion idempotency - attempting to delete an already-deleted file.
 * Validates that soft-deleted files cannot be deleted again, returning 404 Not Found.
 *
 * Steps:
 * 1. Member registers and authenticates via authorize_member_join
 * 2. Member uploads a file with file_type POST_IMAGE
 * 3. First deletion succeeds (returns void)
 * 4. Second deletion attempt fails with HTTP 404 Not Found
 */
export async function test_api_file_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Upload a file that will be deleted twice
  const file = await generate_random_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "POST_IMAGE",
      },
    },
  );
  typia.assert(file);
  // 3. First deletion should succeed (returns void)
  await api.functional.community.member.files.erase(memberConnection, {
    fileId: file.id,
  });
  // 4. Second deletion attempt should fail with 404 Not Found
  await TestValidator.httpError(
    "already deleted file should return 404",
    404,
    async () =>
      await api.functional.community.member.files.erase(memberConnection, {
        fileId: file.id,
      }),
  );
}
