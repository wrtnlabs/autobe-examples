import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_files_upload } from "../../../generate/generate_random_community_platform_member_files_upload";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_member_files_upload_post_image_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id satisfies string &
            tags.Format<"uuid"> as string,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Upload GIF image file for post image
  const uploadData =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {
        body: {
          communityPlatformFileId: typia.random<string & tags.Format<"uuid">>(),
          originalFilename: "post-image.gif",
          mimeType: "image/gif",
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1024> &
              tags.Maximum<5242880>
          >(),
          contentHash: typia.random<string>(),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: "Mozilla/5.0 (Test Client)",
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  typia.assert(uploadData);
  // 5. Validate upload properties
  TestValidator.equals("upload should have ID", uploadData.id, uploadData.id);
  TestValidator.predicate("status should be valid", () =>
    ["pending", "processing", "attached", "expired", "failed"].includes(
      uploadData.status,
    ),
  );
  TestValidator.equals(
    "original filename matches",
    uploadData.original_filename,
    "post-image.gif",
  );
  TestValidator.equals("MIME type matches", uploadData.mime_type, "image/gif");
  TestValidator.predicate("file size positive", uploadData.file_size > 0);
  TestValidator.equals(
    "uploader ID matches member ID",
    uploadData.uploader.id,
    authorized.id,
  );
  TestValidator.predicate(
    "expires at is future date",
    new Date(uploadData.expires_at) > new Date(),
  );
  // 6. Validate file reference
  typia.assert(uploadData.file);
  TestValidator.equals(
    "file name matches",
    uploadData.file.name,
    "post-image.gif",
  );
  TestValidator.equals("file type matches", uploadData.file.type, "image/gif");
  TestValidator.predicate(
    "file size matches",
    uploadData.file.size === uploadData.file_size,
  );
  TestValidator.equals(
    "file actor is member",
    uploadData.file.actor.id,
    authorized.id,
  );
  TestValidator.equals(
    "file actor is member type",
    (uploadData.file.actor as ICommunityPlatformMember.ISummary).username,
    authorized.username,
  );
}
