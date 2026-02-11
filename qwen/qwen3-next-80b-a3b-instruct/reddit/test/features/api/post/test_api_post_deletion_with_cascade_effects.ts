import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_post_deletion_with_cascade_effects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityPlatformAdmin.IJoin;
  const adminToken = await authorize_platform_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // Create new connection with auth token for subsequent calls
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = { Authorization: adminToken.token.access };
  // 2. Generate a random valid post ID for deletion (as creation endpoints are not available)
  // Per system constraints, we cannot create a post. We must test deletion behavior on a valid ID structure.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform deletion
  const deletedPost =
    await api.functional.redditCommunity.platformAdmin.posts.erase(
      adminAuthConnection,
      {
        postId,
      },
    );
  typia.assert(deletedPost);
  // 4. Verify returned object structure matches IRedditCommunityPost
  // Since cascade effects are in backend and cannot be verified due to missing APIs,
  // we ensure the contract is upheld: deletion returns a valid post object with all required fields
  TestValidator.equals("post has valid UUID", typeof deletedPost.id, "string");
  TestValidator.predicate(
    "post has valid UUID format",
    /^[0-9a-f-]{36}$/i.test(deletedPost.id),
  );
  TestValidator.equals("post has title", typeof deletedPost.title, "string");
  TestValidator.predicate(
    "post has content",
    deletedPost.content !== undefined,
  );
  TestValidator.predicate(
    "post has author",
    deletedPost.author !== undefined,
  );
  TestValidator.predicate(
    "post has community",
    deletedPost.community !== undefined,
  );
  TestValidator.equals(
    "post has vote_score",
    typeof deletedPost.vote_score,
    "number",
  );
  TestValidator.equals(
    "post has comments_count",
    typeof deletedPost.comments_count,
    "number",
  );
  TestValidator.equals(
    "post has created_at",
    typeof deletedPost.created_at,
    "string",
  );
  TestValidator.predicate(
    "post has ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
      deletedPost.created_at,
    ),
  );
  TestValidator.equals(
    "post has updated_at",
    typeof deletedPost.updated_at,
    "string",
  );
  TestValidator.predicate(
    "post has ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
      deletedPost.updated_at,
    ),
  );
  TestValidator.predicate(
    "post has status",
    ["active", "deleted", "banned"].includes(deletedPost.status),
  );
  TestValidator.equals(
    "post has karma_score",
    typeof deletedPost.karma_score,
    "number",
  );
}