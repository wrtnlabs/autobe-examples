import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_deleted_contents_create_deleted_content } from "../../../generate/generate_random_community_platform_admin_deleted_contents_create_deleted_content";
import { prepare_random_community_platform_deleted_content } from "../../../prepare/prepare_random_community_platform_deleted_content";

export async function test_api_deleted_content_update_reason_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a deleted content record using generation utility
  const createdDeletedContent =
    await generate_random_community_platform_admin_deleted_contents_create_deleted_content(
      adminConnection,
      {},
    );
  typia.assert(createdDeletedContent);
  // 3. Prepare updated reason with valid UUID string
  const updatedReason = typia.random<string & tags.Format<"uuid">>();
  const updateBody: ICommunityPlatformDeletedContent.IUpdate = {
    reason: updatedReason,
  };
  // 4. Update the reason field of the created deleted content record
  const updatedDeletedContent =
    await api.functional.communityPlatform.admin.deleted_contents.updateDeletedContent(
      adminConnection,
      {
        id: createdDeletedContent.id,
        body: updateBody,
      },
    );
  typia.assert(updatedDeletedContent);
  // 5. Validate updated reason field matches the input
  TestValidator.equals(
    "updated reason",
    updatedDeletedContent.reason,
    updatedReason,
  );
  // 6. Validate audit timestamps update correctly
  TestValidator.predicate(
    "updatedAt timestamp updated",
    new Date(updatedDeletedContent.updated_at).getTime() >
      new Date(createdDeletedContent.updated_at).getTime(),
  );
  // 7. Edge case: attempt to update a non-existent deleted content record
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("update non-existent deleted content", async () => {
    await api.functional.communityPlatform.admin.deleted_contents.updateDeletedContent(
      adminConnection,
      {
        id: fakeId,
        body: updateBody,
      },
    );
  });
}
