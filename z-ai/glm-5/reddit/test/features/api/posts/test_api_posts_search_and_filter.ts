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

export async function test_api_posts_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // 2. Create two communities
  const community1 = await generate_random_community_member_communities_create(
    member1Connection,
    {
      body: {
        name: `tech_${RandomGenerator.alphaNumeric(8)}`,
        description: "Technology discussions and news about programming",
      },
    },
  );
  typia.assert(community1);
  const community2 = await generate_random_community_member_communities_create(
    member2Connection,
    {
      body: {
        name: `gaming_${RandomGenerator.alphaNumeric(8)}`,
        description: "Gaming community for video game enthusiasts",
      },
    },
  );
  typia.assert(community2);
  // 3. Subscribe both members to both communities
  await api.functional.community.member.communities.subscribe(
    member1Connection,
    {
      communityName: community2.name,
    },
  );
  await api.functional.community.member.communities.subscribe(
    member2Connection,
    {
      communityName: community1.name,
    },
  );
  // 4. Create posts with distinct titles and content for search testing
  const textPost1 =
    await generate_random_community_member_communities_posts_create(
      member1Connection,
      {
        params: { communityName: community1.name },
        body: {
          title: "JavaScript TypeScript Programming Guide",
          post_type: "TEXT",
          text_content:
            "A comprehensive guide to modern JavaScript and TypeScript development practices.",
        },
      },
    );
  typia.assert(textPost1);
  const textPost2 =
    await generate_random_community_member_communities_posts_create(
      member2Connection,
      {
        params: { communityName: community1.name },
        body: {
          title: "Python Data Science Tutorial",
          post_type: "TEXT",
          text_content:
            "Learn data science fundamentals using Python programming language.",
        },
      },
    );
  typia.assert(textPost2);
  const linkPost =
    await generate_random_community_member_communities_posts_create(
      member1Connection,
      {
        params: { communityName: community2.name },
        body: {
          title: "Gaming News Portal",
          post_type: "LINK",
          link_url: "https://example.com/gaming-news",
        },
      },
    );
  typia.assert(linkPost);
  const imagePost =
    await generate_random_community_member_communities_posts_create(
      member2Connection,
      {
        params: { communityName: community2.name },
        body: {
          title: "Amazing Game Screenshot",
          post_type: "IMAGE",
          image_url: "https://example.com/screenshot.png",
        },
      },
    );
  typia.assert(imagePost);
  // 5. Test keyword search
  const searchResult = await api.functional.community.posts.index(connection, {
    body: { search: "JavaScript" } satisfies ICommunityPost.IRequest,
  });
  typia.assert(searchResult);
  TestValidator.predicate(
    "search finds JavaScript post",
    searchResult.data.some((p) => p.id === textPost1.id),
  );
  TestValidator.predicate(
    "search does not find unrelated posts",
    searchResult.data.every((p) => p.id !== textPost2.id),
  );
  // 6. Test communityId filter
  const community1Result = await api.functional.community.posts.index(
    connection,
    {
      body: { communityId: community1.id } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(community1Result);
  TestValidator.predicate(
    "community filter returns posts from community1",
    community1Result.data.every((p) => p.community.id === community1.id),
  );
  TestValidator.equals(
    "community filter returns correct count",
    community1Result.data.length >= 2,
    true,
  );
  const community2Result = await api.functional.community.posts.index(
    connection,
    {
      body: { communityId: community2.id } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(community2Result);
  TestValidator.predicate(
    "community filter returns posts from community2",
    community2Result.data.every((p) => p.community.id === community2.id),
  );
  // 7. Test authorId filter
  const author1Result = await api.functional.community.posts.index(connection, {
    body: { authorId: member1.id } satisfies ICommunityPost.IRequest,
  });
  typia.assert(author1Result);
  TestValidator.predicate(
    "author filter returns posts by member1",
    author1Result.data.every((p) => p.author.id === member1.id),
  );
  const author2Result = await api.functional.community.posts.index(connection, {
    body: { authorId: member2.id } satisfies ICommunityPost.IRequest,
  });
  typia.assert(author2Result);
  TestValidator.predicate(
    "author filter returns posts by member2",
    author2Result.data.every((p) => p.author.id === member2.id),
  );
  // 8. Test postType filter
  const textOnlyResult = await api.functional.community.posts.index(
    connection,
    {
      body: { postType: "TEXT" } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(textOnlyResult);
  TestValidator.predicate(
    "postType TEXT filter returns only text posts",
    textOnlyResult.data.every((p) => p.post_type === "TEXT"),
  );
  const linkOnlyResult = await api.functional.community.posts.index(
    connection,
    {
      body: { postType: "LINK" } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(linkOnlyResult);
  TestValidator.predicate(
    "postType LINK filter returns only link posts",
    linkOnlyResult.data.every((p) => p.post_type === "LINK"),
  );
  const imageOnlyResult = await api.functional.community.posts.index(
    connection,
    {
      body: { postType: "IMAGE" } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(imageOnlyResult);
  TestValidator.predicate(
    "postType IMAGE filter returns only image posts",
    imageOnlyResult.data.every((p) => p.post_type === "IMAGE"),
  );
  // 9. Test combined filters: search + communityId
  const searchCommunityResult = await api.functional.community.posts.index(
    connection,
    {
      body: {
        search: "JavaScript",
        communityId: community1.id,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(searchCommunityResult);
  TestValidator.predicate(
    "combined filter search+community matches",
    searchCommunityResult.data.some((p) => p.id === textPost1.id),
  );
  // Test combined filters: search + authorId
  const searchAuthorResult = await api.functional.community.posts.index(
    connection,
    {
      body: {
        search: "JavaScript",
        authorId: member1.id,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(searchAuthorResult);
  TestValidator.predicate(
    "combined filter search+author matches",
    searchAuthorResult.data.some((p) => p.id === textPost1.id),
  );
  // Test combined filters: communityId + authorId
  const communityAuthorResult = await api.functional.community.posts.index(
    connection,
    {
      body: {
        communityId: community1.id,
        authorId: member1.id,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(communityAuthorResult);
  TestValidator.predicate(
    "combined filter community+author finds textPost1",
    communityAuthorResult.data.some((p) => p.id === textPost1.id),
  );
  // 10. Test empty results: search for non-existent keyword
  const emptyResult = await api.functional.community.posts.index(connection, {
    body: {
      search: `nonexistent_keyword_${RandomGenerator.alphaNumeric(16)}`,
    } satisfies ICommunityPost.IRequest,
  });
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns no results",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has records=0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has pages=0",
    emptyResult.pagination.pages,
    0,
  );
}
