import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_details_public_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest user join (authentication prerequisite)
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditCommunityGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // 2. Create new connection with guest authorization token
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    ...guestConnection.headers,
    Authorization: guestAuth.token.access,
  };
  // 3. Generate a post ID (test environment may have pre-existing data)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve post details
  const post = await api.functional.redditCommunity.guest.posts.details.at(
    authorizedConnection,
    {
      postId,
    },
  );
  typia.assert(post);
  // 5. Validate response structure and business logic
  TestValidator.equals("post ID matches request", post.id, postId);
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals(
    "text content is string",
    typeof post.text_content,
    "string",
  );
  TestValidator.equals(
    "author has valid username",
    post.author.username.length > 0,
    true,
  );
  TestValidator.equals(
    "community has valid name",
    post.community.name.length > 0,
    true,
  );
  TestValidator.equals(
    "vote score is integer",
    Number.isInteger(post.vote_score),
    true,
  );
  TestValidator.equals(
    "comment count is integer",
    Number.isInteger(post.comment_count),
    true,
  );
  // Validate timestamps are valid ISO 8601 formatted dates
  const createdDate = new Date(post.created_at);
  TestValidator.predicate(
    "created_at timestamp is valid",
    !isNaN(createdDate.getTime()),
  );
  const updatedDate = new Date(post.updated_at);
  TestValidator.predicate(
    "updated_at timestamp is valid",
    !isNaN(updatedDate.getTime()),
  );
  // Validate soft-delete field
  TestValidator.equals(
    "deleted_at is null for active post",
    post.deleted_at,
    null,
  );
}
