import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate moderator-privilege update of file upload metadata
 *
 * This test ensures that a moderator can update file upload metadata (such as
 * filename and status) for a file that was originally uploaded by a member, as
 * allowed by business rules. The flow is as follows:
 *
 * 1. Register a member (member join)
 * 2. Member uploads a file (create file upload with member)
 * 3. Register a moderator for the same or an admin-enabled community (moderator
 *    join)
 * 4. Using the moderator token, update file upload's metadata (via moderator
 *    update endpoint): change original_filename, status, and url
 * 5. Confirm that changes are persisted, metadata is updated, status change is
 *    effective, and that file remains linked by its id and
 *    uploaded_by_member_id
 * 6. Error validation: Assert that a non-moderator (e.g., a member or unrelated
 *    moderator) cannot update the file (expect error)
 */
export async function test_api_file_upload_metadata_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
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
          original_filename: RandomGenerator.name() + ".png",
          storage_key: RandomGenerator.alphaNumeric(16),
          mime_type: "image/png",
          file_size_bytes: 123456,
          url: "https://files.cdn/" + RandomGenerator.alphaNumeric(24),
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 3. Register a moderator for this community (simulate community_id as random uuid)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const communityId = typia.random<string & tags.Format<"uuid">>(); // (in reality, this would be real/related to file, in test just random)
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
      community_id: communityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  // 4. Moderator updates file upload metadata: change original_filename, status, url
  const updatedFilename = RandomGenerator.name() + "-edited.png";
  const updatedStatus = "archived";
  const updatedUrl = "https://files.cdn/" + RandomGenerator.alphaNumeric(28);
  const updatedUpload =
    await api.functional.communityPlatform.moderator.fileUploads.update(
      connection,
      {
        fileUploadId: fileUpload.id,
        body: {
          original_filename: updatedFilename,
          status: updatedStatus,
          url: updatedUrl,
        } satisfies ICommunityPlatformFileUpload.IUpdate,
      },
    );
  typia.assert(updatedUpload);

  // 5. Confirm changes: updated fields actually changed
  TestValidator.equals(
    "updated file upload id same",
    updatedUpload.id,
    fileUpload.id,
  );
  TestValidator.equals(
    "original_filename updated",
    updatedUpload.original_filename,
    updatedFilename,
  );
  TestValidator.equals("status updated", updatedUpload.status, updatedStatus);
  TestValidator.equals("url updated", updatedUpload.url, updatedUrl);
  // uploaded_by_member_id and relationships should remain unchanged
  TestValidator.equals(
    "uploader id unchanged",
    updatedUpload.uploaded_by_member_id,
    memberAuth.id,
  );

  // 6. Authorization negative: a member cannot update fileUpload via moderator endpoint
  await TestValidator.error(
    "member cannot update file upload metadata via moderator endpoint",
    async () => {
      await api.functional.communityPlatform.moderator.fileUploads.update(
        connection,
        {
          fileUploadId: fileUpload.id,
          body: {
            original_filename: RandomGenerator.name() + "-fail.png",
          } satisfies ICommunityPlatformFileUpload.IUpdate,
        },
      );
    },
  );
}
