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

export async function test_api_post_details_view_link_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Fetch a post to view details
  const postId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.details.at(
    memberConnection,
    { postId },
  );
  typia.assert(post);
  // 3. Validate link post structure (post_type, link_url, text_content)
  TestValidator.equals("post type is link", post.post_type, "link");
  TestValidator.equals(
    "text content is null for link post",
    post.text_content,
    null,
  );
  TestValidator.equals("deleted at is null", post.deleted_at, null);
  TestValidator.notEquals("link post has valid link URL", post.link_url, null);
  TestValidator.notEquals("link URL is present", post.link_url, undefined);
  // 4. Validate link URL format
  if (post.link_url !== undefined && post.link_url !== null) {
    const linkUrl = post.link_url;
    TestValidator.predicate("link URL is valid URI", () => {
      try {
        new URL(linkUrl);
        return true;
      } catch {
        return false;
      }
    });
  }
  // 5. Validate all required post fields are present
  TestValidator.predicate("has valid post id", post.id !== undefined);
  TestValidator.predicate("has title", post.title.length > 0);
  TestValidator.predicate(
    "has created timestamp",
    post.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated timestamp",
    post.updated_at !== undefined,
  );
  TestValidator.predicate(
    "has vote score",
    typeof post.vote_score === "number",
  );
  TestValidator.predicate(
    "has comment count",
    typeof post.comment_count === "number",
  );
  TestValidator.predicate("has author", post.author !== undefined);
  TestValidator.predicate("has community", post.community !== undefined);
  // 6. Validate author and community are proper summary objects
  TestValidator.predicate("author has valid id", post.author.id !== undefined);
  TestValidator.predicate(
    "author has username",
    post.author.username.length > 0,
  );
  TestValidator.predicate(
    "community has valid id",
    post.community.id !== undefined,
  );
  TestValidator.predicate("community has name", post.community.name.length > 0);
}