import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_posts_pagination_browse(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create a community using utility function
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Subscribe to the community (required for posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // Create TEXT post with long content for text_preview verification
  const textContent = RandomGenerator.content({ paragraphs: 3 });
  const textPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: `TEXT Post ${RandomGenerator.paragraph({ sentences: 2 })}`,
          post_type: "TEXT",
          text_content: textContent,
        },
      },
    );
  typia.assert(textPost);
  // Create LINK post for link_domain verification
  const linkPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: `LINK Post ${RandomGenerator.paragraph({ sentences: 2 })}`,
          post_type: "LINK",
          link_url: "https://example.com/articles/test-article",
        },
      },
    );
  typia.assert(linkPost);
  // Create IMAGE post for image_thumbnail_url verification
  const imagePost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: `IMAGE Post ${RandomGenerator.paragraph({ sentences: 2 })}`,
          post_type: "IMAGE",
          image_url: "https://example.com/images/sample-photo.jpg",
        },
      },
    );
  typia.assert(imagePost);
  // Create additional posts for pagination testing (need at least 5 total)
  await ArrayUtil.asyncRepeat(2, async () => {
    const post =
      await generate_random_community_member_communities_posts_create(
        memberConnection,
        {
          params: { communityName: community.name },
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "TEXT",
            text_content: RandomGenerator.paragraph({ sentences: 5 }),
          },
        },
      );
    typia.assert(post);
  });
  // Call the target endpoint with default parameters
  const allPostsResponse = await api.functional.community.posts.index(
    memberConnection,
    { body: {} satisfies ICommunityPost.IRequest },
  );
  typia.assert(allPostsResponse);
  // Verify response contains our posts
  TestValidator.predicate(
    "response contains created posts",
    allPostsResponse.data.length >= 5,
  );
  // Find our posts in the response
  const textPostInResponse = allPostsResponse.data.find(
    (p) => p.id === textPost.id,
  );
  const linkPostInResponse = allPostsResponse.data.find(
    (p) => p.id === linkPost.id,
  );
  const imagePostInResponse = allPostsResponse.data.find(
    (p) => p.id === imagePost.id,
  );
  // Verify TEXT post has text_preview and no link/image fields
  const verifiedTextPost = typia.assert(textPostInResponse!);
  TestValidator.predicate(
    "TEXT post has text_preview",
    verifiedTextPost.text_preview !== null,
  );
  TestValidator.predicate(
    "TEXT post text_preview is at most 200 characters",
    verifiedTextPost.text_preview!.length <= 200,
  );
  TestValidator.equals(
    "TEXT post link_domain is null",
    verifiedTextPost.link_domain,
    null,
  );
  TestValidator.equals(
    "TEXT post image_thumbnail_url is null",
    verifiedTextPost.image_thumbnail_url,
    null,
  );
  // Verify LINK post has link_domain and no text/image fields
  const verifiedLinkPost = typia.assert(linkPostInResponse!);
  TestValidator.equals(
    "LINK post text_preview is null",
    verifiedLinkPost.text_preview,
    null,
  );
  TestValidator.predicate(
    "LINK post has link_domain",
    verifiedLinkPost.link_domain !== null,
  );
  TestValidator.predicate(
    "LINK post link_domain contains domain name",
    verifiedLinkPost.link_domain!.includes("example.com"),
  );
  TestValidator.equals(
    "LINK post image_thumbnail_url is null",
    verifiedLinkPost.image_thumbnail_url,
    null,
  );
  // Verify IMAGE post has image_thumbnail_url and no text/link fields
  const verifiedImagePost = typia.assert(imagePostInResponse!);
  TestValidator.equals(
    "IMAGE post text_preview is null",
    verifiedImagePost.text_preview,
    null,
  );
  TestValidator.equals(
    "IMAGE post link_domain is null",
    verifiedImagePost.link_domain,
    null,
  );
  TestValidator.predicate(
    "IMAGE post has image_thumbnail_url",
    verifiedImagePost.image_thumbnail_url !== null,
  );
  // Test pagination - page 1 with limit 2
  const page1Response = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 returns at most 2 items",
    page1Response.data.length,
    Math.min(2, page1Response.pagination.records),
  );
  TestValidator.equals(
    "pagination current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    page1Response.pagination.limit,
    2,
  );
  // Test pagination - page 2 with limit 2
  const page2Response = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        limit: 2,
        page: 2,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination current page is 2",
    page2Response.pagination.current,
    2,
  );
  // Verify page 1 and page 2 have different posts (if enough records)
  if (page1Response.data.length === 2 && page2Response.data.length > 0) {
    TestValidator.predicate(
      "page 1 and page 2 have different posts",
      page1Response.data[0].id !== page2Response.data[0].id,
    );
  }
  // Verify pagination metadata consistency
  TestValidator.equals(
    "pagination records count is consistent across pages",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  TestValidator.equals(
    "pagination pages count is consistent across pages",
    page1Response.pagination.pages,
    page2Response.pagination.pages,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    page1Response.pagination.pages ===
      Math.ceil(
        page1Response.pagination.records / page1Response.pagination.limit,
      ),
  );
  // Test community filter
  const communityFilterResponse = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        communityId: community.id,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(communityFilterResponse);
  TestValidator.predicate(
    "community filter returns only posts from that community",
    communityFilterResponse.data.every((p) => p.community.id === community.id),
  );
  // Verify post summary fields exist and are valid
  const samplePost = allPostsResponse.data[0];
  typia.assert(samplePost);
  TestValidator.predicate(
    "post has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      samplePost.id,
    ),
  );
  TestValidator.predicate(
    "post has non-empty title",
    samplePost.title.length > 0,
  );
  TestValidator.predicate(
    "post has valid post_type",
    ["TEXT", "LINK", "IMAGE"].includes(samplePost.post_type),
  );
  TestValidator.predicate(
    "post has valid author with id",
    samplePost.author.id !== null,
  );
  TestValidator.predicate(
    "post has valid author username",
    samplePost.author.username.length >= 3,
  );
  TestValidator.predicate(
    "post has valid community with id",
    samplePost.community.id !== null,
  );
  TestValidator.predicate(
    "post has valid community name",
    samplePost.community.name.length >= 3,
  );
  TestValidator.predicate(
    "post has numeric vote_score",
    typeof samplePost.vote_score === "number",
  );
  TestValidator.predicate(
    "post has numeric comment_count",
    typeof samplePost.comment_count === "number",
  );
  TestValidator.predicate(
    "post has valid created_at timestamp",
    samplePost.created_at !== null,
  );
}