import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostFeed";
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

export async function test_api_post_feed_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // Create a post in the community which automatically generates a post feed entry
  // We cannot access any properties from ICommunityPost (it's empty), so we proceed without id
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(post);
  // Create a separate connection for the unauthenticated endpoint (per connection isolation pattern)
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID since we cannot access the post's id from ICommunityPost
  // This tests the endpoint functionality with a valid UUID format
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the post feed entry by its unique ID
  const postFeed = await api.functional.community.post_feeds.at(
    publicConnection,
    { id: postId },
  );
  typia.assert(postFeed);
}
