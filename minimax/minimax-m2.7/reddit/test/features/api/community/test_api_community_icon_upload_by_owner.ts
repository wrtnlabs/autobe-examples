import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_icons_upload_icon } from "../../../generate/generate_random_reddit_clone_member_communities_icons_upload_icon";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_community_icon } from "../../../prepare/prepare_random_reddit_clone_community_icon";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";

/**
 * Test that a community owner can successfully upload an icon image to their community.
 *
 * Steps:
 * 1. Register a new member account
 * 2. Create a new community with the member as owner
 * 3. Upload a valid image file to the platform (wait for status='processed')
 * 4. Submit the file ID to associate it as the community icon
 *
 * Expected: 201 Created response with icon resource containing icon ID,
 * created timestamp, community summary, and file details. The icon should
 * appear in subsequent community queries.
 */
export async function test_api_community_icon_upload_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new community with the member as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Upload a valid image file to the platform
  // Create a minimal valid PNG image (1x1 pixel, base64 encoded)
  const minimalPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        file_data: minimalPngBase64,
        mime_type: "image/png",
        original_filename: "test_icon.png",
        target_id: community.id,
        target_type: "community",
      },
    },
  );
  typia.assert(file);
  // Wait for file to be processed (virus scan completed)
  // The file status should be 'processed' before we can use it as icon
  const processedFile =
    file.status === "processed"
      ? file
      : await new Promise<typeof file>((resolve) => {
          const maxAttempts = 10;
          let attempts = 0;
          const poll = async () => {
            attempts++;
            // Re-fetch the file to check updated status
            const updatedFile =
              await api.functional.redditClone.member.files.create(
                memberConnection,
                {
                  body: {
                    file_data: minimalPngBase64,
                    mime_type: "image/png",
                    original_filename: "test_icon_check.png",
                    target_id: community.id,
                    target_type: "community",
                  },
                },
              );
            if (updatedFile.status === "processed" || attempts >= maxAttempts) {
              resolve(updatedFile);
            } else {
              setTimeout(poll, 500);
            }
          };
          setTimeout(poll, 500);
        });
  typia.assert(processedFile);
  TestValidator.equals("file is processed", processedFile.status, "processed");
  // 4. Upload the icon to the community
  const icon =
    await generate_random_reddit_clone_member_communities_icons_upload_icon(
      memberConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          iconFileId: processedFile.id,
        },
      },
    );
  typia.assert(icon);
  // 5. Validate the response
  TestValidator.equals("icon has valid id", !!icon.id, true);
  TestValidator.equals("icon has valid created_at", !!icon.created_at, true);
  TestValidator.equals(
    "icon community matches",
    icon.community.id,
    community.id,
  );
  TestValidator.equals(
    "icon community name matches",
    icon.community.name,
    community.name,
  );
  TestValidator.equals(
    "icon file id matches uploaded file",
    icon.file.id,
    processedFile.id,
  );
  TestValidator.equals(
    "icon file original filename matches",
    icon.file.originalFilename,
    processedFile.originalFilename,
  );
  TestValidator.equals(
    "icon file mime type matches",
    icon.file.mimeType,
    processedFile.mimeType,
  );
  TestValidator.equals(
    "icon file status matches",
    icon.file.status,
    processedFile.status,
  );
}
