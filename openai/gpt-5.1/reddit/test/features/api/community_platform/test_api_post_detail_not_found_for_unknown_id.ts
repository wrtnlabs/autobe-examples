import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register a member user to obtain authenticated context for memberUser flows
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!", // satisfies MinLength<8>
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create a community for the member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a valid text post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(createdPost);

  // Sanity check: we can read back the created post by its real id
  const fetchedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert<ICommunityPlatformPost>(fetchedPost);
  TestValidator.equals(
    "fetched post id should match created post id",
    fetchedPost.id,
    createdPost.id,
  );

  // 4. Generate a well-formed but unknown UUID for not-found scenario
  let unknownPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownPostId === createdPost.id) {
    unknownPostId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Call public post detail endpoint with non-existent postId and expect 404
  await TestValidator.httpError(
    "unknown postId should result in 404 not-found",
    404,
    async () => {
      await api.functional.communityPlatform.posts.at(connection, {
        postId: unknownPostId,
      });
    },
  );
}
