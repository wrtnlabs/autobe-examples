import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies ICommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberData });
  // 2. Create a post
  // Even though ICommunityPost.ICreate is empty, we must call the function
  // The server will generate the post data
  const createdPost = await generate_random_community_member_posts_create(
    memberConnection,
    { body: {} },
  );
  const safeCreatedPost = typia.assert<ICommunityPost & { id: string; updated_at: string }>(createdPost);
  // 3. Update the post
  // Even though ICommunityPost.IUpdate is empty, we must call the function with empty object
  const updatedPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: safeCreatedPost.id,
      body: {},
    },
  );
  const safeUpdatedPost = typia.assert<ICommunityPost & { id: string; updated_at: string }>(updatedPost);
  // 4. Validate that the post was returned
  TestValidator.equals("post id unchanged", safeUpdatedPost.id, safeCreatedPost.id);
  TestValidator.notEquals(
    "updated_at changed",
    safeCreatedPost.updated_at,
    safeUpdatedPost.updated_at,
  );
}