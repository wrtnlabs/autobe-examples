import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_community_platform_user_comments_create_top_level_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // Setup userConnection authorization header
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare creation payload for a top-level comment (no parent_id)
  const user_id = typia.random<string & tags.Format<"uuid">>();
  const post_id = typia.random<string & tags.Format<"uuid">>();
  const content = RandomGenerator.paragraph({ sentences: 2 });
  // 3. Create top-level comment (parent_id explicitly null to indicate top-level)
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {
        user_id: user_id,
        post_id: post_id,
        content: content,
        parent_id: null,
      },
    },
  );
  // 4. Validate the response
  typia.assert(comment);
  // Cast to 'any' to avoid type errors due to missing properties
  const anyComment = comment as any;
  // Validate is_deleted is false if exists
  TestValidator.equals("is_deleted", anyComment.is_deleted, false);
  // Validate parent_id is null if exists
  TestValidator.equals("parent_id", anyComment.parent_id, null);
  // Validate content matches
  TestValidator.equals("content", anyComment.content, content);
  // Validate timestamps exist and are valid date-time strings
  TestValidator.predicate(
    "created_at exists and is ISO string",
    typeof anyComment.created_at === "string" && anyComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists and is ISO string",
    typeof anyComment.updated_at === "string" && anyComment.updated_at.length > 0,
  );
  // 5. Validate authorization enforcement
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized without token", async () => {
    await generate_random_community_platform_user_comments_create(
      anonymousConnection,
      {
        body: {
          user_id: user_id,
          post_id: post_id,
          content: content,
        },
      },
    );
  });
}
