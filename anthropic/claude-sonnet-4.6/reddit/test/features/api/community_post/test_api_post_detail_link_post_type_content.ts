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

export async function test_api_post_detail_link_post_type_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and set up actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new community using the utility function
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a link-type post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postUrl = "https://www.example.com/article";
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: postTitle,
        type: "link",
        url: postUrl,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve the post detail by its ID
  const detail = await api.functional.community.posts.at(memberConnection, {
    postId: post.id,
  });
  typia.assert(detail);
  // 6. Validate standard post business logic fields
  TestValidator.equals("post type is link", detail.type, "link");
  TestValidator.equals("post title matches input", detail.title, postTitle);
  TestValidator.equals("voteScore is 0", detail.voteScore, 0);
  TestValidator.equals("commentCount is 0", detail.commentCount, 0);
  TestValidator.equals("deletedAt is null", detail.deletedAt, null);
  // 7. Validate the discriminated union content for link type
  const content = detail.content as ICommunityPost.ILinkContent;
  TestValidator.predicate(
    "content type discriminator is link",
    (detail.content as { type?: string }).type === "link",
  );
  TestValidator.equals(
    "content url matches submitted url",
    content.url,
    postUrl,
  );
  TestValidator.predicate(
    "domain is non-empty string derived from url",
    content.domain.length > 0,
  );
}
