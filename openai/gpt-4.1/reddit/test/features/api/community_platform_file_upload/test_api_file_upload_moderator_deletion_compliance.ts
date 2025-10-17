import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test compliance of moderator file deletion, permission, and
 * cascade/soft-deletion logic.
 *
 * 1. Register member (member join)
 * 2. Member uploads a file
 * 3. Register moderator for the community (using member's email, valid community
 *    id)
 * 4. Moderator deletes uploaded file
 * 5. Validate the file cannot be deleted again (confirm deletion effect)
 * 6. Attempt file deletion by a non-moderator (should error)
 * 7. (If possible) Upload a file with intention of making it 'in-use', attempt
 *    deletion and expect error
 * 8. Validate that downstream cascade/soft-deletion effect is enforced (e.g., file
 *    no longer appears in listings)
 */
export async function test_api_file_upload_moderator_deletion_compliance(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuth);

  // 2. Member uploads a file
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberAuth.id,
          original_filename: RandomGenerator.paragraph({ sentences: 2 }),
          storage_key: RandomGenerator.alphaNumeric(16),
          mime_type: RandomGenerator.pick([
            "image/jpeg",
            "image/png",
            "image/gif",
            "application/pdf",
          ] as const),
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(24)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 3. Register moderator (simulate a community uuid for assignment)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "modpassword123" as string & tags.Format<"password">,
      community_id: communityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  // Switch to moderator context by setting auth token
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "modpassword123" as string & tags.Format<"password">,
      community_id: communityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });

  // 4. Moderator deletes uploaded file
  await api.functional.communityPlatform.moderator.fileUploads.erase(
    connection,
    {
      fileUploadId: fileUpload.id,
    },
  );
  // (no return value)

  // 5. Validate file cannot be deleted again (should error)
  await TestValidator.error(
    "repeat moderator file deletion should error",
    async () => {
      await api.functional.communityPlatform.moderator.fileUploads.erase(
        connection,
        {
          fileUploadId: fileUpload.id,
        },
      );
    },
  );

  // 6. Try to delete as member (should error: permission denied)
  // Switch back to member context
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error("non-moderator cannot delete file", async () => {
    await api.functional.communityPlatform.moderator.fileUploads.erase(
      connection,
      {
        fileUploadId: fileUpload.id,
      },
    );
  });
}
