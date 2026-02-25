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

export async function test_api_deleted_content_retrieval_success_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    },
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Fake deleted content id to query (simulate a valid UUID)
  const deletedContentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve deleted content metadata with adminConnection
  const deletedContent =
    await api.functional.communityPlatform.admin.deleted_contents.atDeletedContent(
      adminConnection,
      { id: deletedContentId },
    );
  typia.assert(deletedContent);
  // 4. Validate essential properties existence via TestValidator
  TestValidator.predicate(
    "deleted content has id",
    typeof deletedContent.id === "string" && deletedContent.id.length > 0,
  );
  TestValidator.predicate(
    "deleted content has moderator_id",
    typeof deletedContent.moderator_id === "string" &&
      deletedContent.moderator_id.length > 0,
  );
  TestValidator.predicate(
    "deleted content has user_id",
    typeof deletedContent.user_id === "string" &&
      deletedContent.user_id.length > 0,
  );
  TestValidator.predicate(
    "deleted content has reason",
    typeof deletedContent.reason === "string" &&
      deletedContent.reason.length > 0,
  );
  TestValidator.predicate(
    "deleted content has timestamps",
    typeof deletedContent.created_at === "string" &&
      deletedContent.created_at.length > 0 &&
      typeof deletedContent.updated_at === "string" &&
      deletedContent.updated_at.length > 0,
  );
  // 5. Validate optional post_id and comment_id types
  TestValidator.predicate(
    "post_id nullable or valid string",
    deletedContent.post_id === null ||
      typeof deletedContent.post_id === "string",
  );
  TestValidator.predicate(
    "comment_id nullable or valid string",
    deletedContent.comment_id === null ||
      typeof deletedContent.comment_id === "string",
  );
  // 6. Validate related objects presence
  TestValidator.predicate(
    "moderator summary present",
    deletedContent.moderator !== null,
  );
  TestValidator.predicate("user summary present", deletedContent.user !== null);
  // If post present, validate as well
  if (deletedContent.post !== null) {
    typia.assert(deletedContent.post);
  }
  // If comment present, validate as well
  if (deletedContent.comment !== null) {
    typia.assert(deletedContent.comment);
  }
}
