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
 * Test successful file deletion by the file owner.
 *
 * Steps:
 * 1. Member registers and authenticates
 * 2. Member uploads an image file with file_type 'AVATAR'
 * 3. Capture the returned fileId from the upload response
 * 4. Member deletes the file via DELETE /community/member/files/{fileId}
 * 5. Verify deletion succeeded (void response)
 * 6. Verify file is deleted by attempting to delete again (should fail)
 */
export async function test_api_file_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registers and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Member uploads an image file with file_type 'AVATAR'
  const file = await generate_random_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "AVATAR",
      },
    },
  );
  typia.assert(file);
  // 3. Capture the returned fileId
  const fileId = file.id;
  // 4. Member deletes the file
  await api.functional.community.member.files.erase(memberConnection, {
    fileId,
  });
  // 5. Verify file is deleted by attempting to delete again (should fail with 404)
  await TestValidator.httpError(
    "should fail when deleting non-existent file",
    404,
    async () => {
      await api.functional.community.member.files.erase(memberConnection, {
        fileId,
      });
    },
  );
}
