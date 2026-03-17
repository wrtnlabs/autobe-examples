import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_creation_text_type_by_subscribed_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and set up authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new community using the authenticated member's connection
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a text-type post in the community
  const postTitle = "My First Post";
  const postBody = "Hello, world!";
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: postTitle,
        type: "text",
        body: postBody,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Validate business logic
  TestValidator.equals("post title matches input", post.title, postTitle);
  TestValidator.equals("post type is text", post.type, "text");
  // Validate content discriminated union - narrow to ITextContent
  const textContent = typia.assert<ICommunityPost.ITextContent>(post.content);
  TestValidator.equals("content type is text", textContent.type, "text");
  TestValidator.equals(
    "content body matches input",
    textContent.body,
    postBody,
  );
  TestValidator.equals("author id matches member", post.author.id, member.id);
  TestValidator.equals(
    "author username matches member",
    post.author.username,
    member.username,
  );
  TestValidator.equals("community id matches", post.community.id, community.id);
  TestValidator.equals("voteScore is 0", post.voteScore, 0);
  TestValidator.equals("commentCount is 0", post.commentCount, 0);
  TestValidator.equals("deletedAt is null", post.deletedAt, null);
  TestValidator.equals(
    "createdAt equals updatedAt (freshly created)",
    post.createdAt,
    post.updatedAt,
  );
}
