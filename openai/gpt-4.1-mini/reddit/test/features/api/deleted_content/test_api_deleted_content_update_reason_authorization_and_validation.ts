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

export async function test_api_deleted_content_update_reason_authorization_and_validation(
  connection: api.IConnection,
): Promise<void> {
  // Authorization failure tests: try updating deleted content without admin connection
  const baseConnection: api.IConnection = { host: connection.host };
  // Generate random UUID and valid update body
  const randomId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformDeletedContent.IUpdate;
  // Expect error for unauthorized client (no auth)
  await TestValidator.httpError(
    "should reject update without any authentication",
    401,
    async () => {
      await api.functional.communityPlatform.admin.deleted_contents.updateDeletedContent(
        baseConnection,
        { id: randomId, body: updateBody },
      );
    },
  );
  // Setup admin connection via join for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Create a deleted content record to update
  const created =
    await generate_random_community_platform_admin_deleted_contents_create_deleted_content(
      adminConnection,
      {},
    );
  typia.assert(created);
  // Try update with unauthorized connection again, but using valid existing record ID
  await TestValidator.httpError(
    "should reject update by unauthenticated user on existing record",
    401,
    async () => {
      await api.functional.communityPlatform.admin.deleted_contents.updateDeletedContent(
        baseConnection,
        { id: created.id, body: updateBody },
      );
    },
  );
  // Valid update attempt with authorized admin
  const updated =
    await api.functional.communityPlatform.admin.deleted_contents.updateDeletedContent(
      adminConnection,
      { id: created.id, body: updateBody },
    );
  typia.assert(updated);
  // Validate that the updated reason matches input
  TestValidator.equals(
    "updated reason matches",
    updated.reason,
    updateBody.reason,
  );
}
