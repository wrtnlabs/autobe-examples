import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_details_view_text_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Fetch post details using valid UUID
  const postId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.details.at(
    memberConnection,
    {
      postId,
    },
  );
  typia.assert(post);
  // 3. Validate post type is text post
  TestValidator.equals("post_type is text", post.post_type, "text");
  // 4. Validate text_content is present for text post
  TestValidator.notEquals(
    "text_content is non-null for text post",
    post.text_content,
    null,
  );
  // 5. Validate link_url is null for text post
  TestValidator.equals("link_url is null for text post", post.link_url, null);
  // 6. Validate timestamps are present
  TestValidator.notEquals("created_at is present", post.created_at, "");
  TestValidator.notEquals("updated_at is present", post.updated_at, "");
  // 7. Validate deleted_at is null (active post)
  TestValidator.equals(
    "deleted_at is null (active post)",
    post.deleted_at,
    null,
  );
  // 8. Validate vote_score is integer
  TestValidator.predicate(
    "vote_score is integer",
    Number.isInteger(post.vote_score),
  );
  // 9. Validate comment_count is integer
  TestValidator.predicate(
    "comment_count is integer",
    Number.isInteger(post.comment_count),
  );
  // 10. Validate author field
  TestValidator.notEquals("author id is valid uuid", post.author.id, "");
  TestValidator.notEquals(
    "author username is non-empty",
    post.author.username,
    "",
  );
  // 11. Validate community field
  TestValidator.notEquals("community id is valid uuid", post.community.id, "");
  TestValidator.notEquals(
    "community name is non-empty",
    post.community.name,
    "",
  );
}
