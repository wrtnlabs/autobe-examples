import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_user_posts_filtering_by_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditClonePostTextContent.ICreate,
    },
  );
  // 4. Create posts of different types
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "link",
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(linkPost);
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "image",
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(imagePost);
  // 5. Filter posts with postType='text'
  const textPostsResponse =
    await api.functional.redditClone.member.users.posts.index(
      memberConnection,
      {
        username: member.username,
        body: {
          postType: "text",
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(textPostsResponse);
  // 6. Validate only text posts are returned
  TestValidator.equals("text posts count", textPostsResponse.data.length, 1);
  TestValidator.equals(
    "text post type",
    textPostsResponse.data[0].type,
    "text",
  );
  TestValidator.equals(
    "text post id matches",
    textPostsResponse.data[0].id,
    textPost.id,
  );
  // 7. Filter posts with postType='link'
  const linkPostsResponse =
    await api.functional.redditClone.member.users.posts.index(
      memberConnection,
      {
        username: member.username,
        body: {
          postType: "link",
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(linkPostsResponse);
  // 8. Validate only link posts are returned
  TestValidator.equals("link posts count", linkPostsResponse.data.length, 1);
  TestValidator.equals(
    "link post type",
    linkPostsResponse.data[0].type,
    "link",
  );
  TestValidator.equals(
    "link post id matches",
    linkPostsResponse.data[0].id,
    linkPost.id,
  );
  // 9. Filter posts with postType='image'
  const imagePostsResponse =
    await api.functional.redditClone.member.users.posts.index(
      memberConnection,
      {
        username: member.username,
        body: {
          postType: "image",
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(imagePostsResponse);
  // 10. Validate only image posts are returned
  TestValidator.equals("image posts count", imagePostsResponse.data.length, 1);
  TestValidator.equals(
    "image post type",
    imagePostsResponse.data[0].type,
    "image",
  );
  TestValidator.equals(
    "image post id matches",
    imagePostsResponse.data[0].id,
    imagePost.id,
  );
  // 11. Retrieve all posts without filter
  const allPostsResponse =
    await api.functional.redditClone.member.users.posts.index(
      memberConnection,
      {
        username: member.username,
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(allPostsResponse);
  // 12. Validate all three posts are returned
  TestValidator.equals("all posts count", allPostsResponse.data.length, 3);
  TestValidator.predicate(
    "contains text post",
    allPostsResponse.data.some((p) => p.id === textPost.id),
  );
  TestValidator.predicate(
    "contains link post",
    allPostsResponse.data.some((p) => p.id === linkPost.id),
  );
  TestValidator.predicate(
    "contains image post",
    allPostsResponse.data.some((p) => p.id === imagePost.id),
  );
}
