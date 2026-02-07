import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_posts_new_create } from "../../../generate/generate_random_community_admin_posts_new_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_create_text_content(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Create text-based post
  const post = await generate_random_community_admin_posts_new_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 50,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 50,
          wordMin: 3,
          wordMax: 10,
        }),
        content_type: "text",
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  
  // Extract actual post content - likely nested in 'post' or 'entity' field based on API structure
  const postContent = (post as any).post ?? (post as any).entity ?? post;
  
  // Validate post has required fields
  TestValidator.predicate(
    "title length is between 5-300 characters",
    postContent.title.length >= 5 && postContent.title.length <= 300,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(postContent.id),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    postContent.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    postContent.updated_at !== undefined,
  );
}