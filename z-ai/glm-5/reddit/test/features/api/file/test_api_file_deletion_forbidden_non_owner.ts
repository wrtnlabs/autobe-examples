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
 * Test authorization enforcement: a member cannot delete another member's file.
 *
 * This test validates the ownership-based authorization rule for file deletion.
 * Only the member who uploaded a file should be able to delete it.
 *
 * Test Flow:
 * 1. Member A registers and uploads a file
 * 2. Member B registers with different credentials
 * 3. Member B attempts to delete Member A's file
 * 4. Verify 403 Forbidden error is returned
 */
export async function test_api_file_deletion_forbidden_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A registers and uploads a file
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphaNumeric(12),
      href: "https://test.com",
    },
  });
  typia.assert(memberA);
  // Member A uploads a file
  const file = await generate_random_community_member_files_create(
    memberAConnection,
    {
      body: {
        file_type: "COMMUNITY_ICON",
        file: "test-file-content",
      },
    },
  );
  typia.assert(file);
  // Step 2: Member B registers with different credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password456!",
      username: RandomGenerator.alphaNumeric(12),
      href: "https://test.com",
    },
  });
  typia.assert(memberB);
  // Verify members are different
  TestValidator.notEquals(
    "Member A and Member B should be different users",
    memberA.id,
    memberB.id,
  );
  // Step 3 & 4: Member B attempts to delete Member A's file
  // Should receive 403 Forbidden error
  await TestValidator.httpError(
    "Member B cannot delete Member A's file",
    403,
    async () =>
      await api.functional.community.member.files.erase(memberBConnection, {
        fileId: file.id,
      }),
  );
}
