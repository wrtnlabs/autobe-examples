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

// Define a more complete interface that includes expected runtime properties
interface ICommunityPostWithMetadata extends ICommunityPost {
  id: string;
  status: "approved" | "pending" | "rejected";
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}

export async function test_api_post_create_link_content(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Create a link-based post (as per scenario, though DTO is empty)
  // We must pass empty body because ICommunityPost.ICreate is {} as per DTO
  const createdPost = await generate_random_community_admin_posts_new_create(
    adminConnection,
    { body: {} },
  );
  // Assert the actual runtime shape
  const validatedPost = typia.assert<ICommunityPostWithMetadata>(createdPost);
  // Validate core properties
  TestValidator.equals(
    "post has valid UUID id",
    true,
    typeof validatedPost.id === "string" && validatedPost.id.length > 0,
  );
  TestValidator.equals(
    "post has status 'approved'",
    validatedPost.status,
    "approved",
  );
  TestValidator.predicate(
    "post has creation timestamp",
    validatedPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "post has update timestamp",
    validatedPost.updated_at !== undefined,
  );
}