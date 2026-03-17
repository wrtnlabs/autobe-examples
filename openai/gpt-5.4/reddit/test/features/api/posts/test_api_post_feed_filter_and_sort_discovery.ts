import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_links_create } from "../../../generate/generate_random_community_platform_member_posts_links_create";
import { generate_random_community_platform_member_posts_texts_create } from "../../../generate/generate_random_community_platform_member_posts_texts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_feed_filter_and_sort_discovery(
  connection: api.IConnection,
): Promise<void> {
  const memberOneConnection: api.IConnection = { host: connection.host };
  const memberOneAuth = await authorize_member_join(memberOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberOneAuth);
  const memberTwoConnection: api.IConnection = { host: connection.host };
  const memberTwoAuth = await authorize_member_join(memberTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberTwoAuth);
  const communityOne =
    await generate_random_community_platform_member_communities_create(
      memberOneConnection,
      {
        body: {
          slug: `feed-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphabets(4)}`,
          title: `Feed Community ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(communityOne);
  const communityTwo =
    await generate_random_community_platform_member_communities_create(
      memberTwoConnection,
      {
        body: {
          slug: `feed-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphabets(4)}`,
          title: `Discovery Community ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(communityTwo);
  const authorKeyword = `author-${RandomGenerator.alphabets(6)}`;
  const searchKeyword = `search-${RandomGenerator.alphabets(6)}`;
  const extraKeyword = `extra-${RandomGenerator.alphabets(6)}`;
  const textPostOne =
    await generate_random_community_platform_member_posts_create(
      memberOneConnection,
      {
        body: {
          title: `${searchKeyword} text primary ${RandomGenerator.paragraph({ sentences: 3 })}`,
          community_platform_community_id: communityOne.id,
          post_type: "text",
        },
      },
    );
  typia.assert(textPostOne);
  const textContentOne =
    await generate_random_community_platform_member_posts_texts_create(
      memberOneConnection,
      {
        params: { postId: textPostOne.id },
        body: {
          body: `${searchKeyword} ${authorKeyword} ${RandomGenerator.content({ paragraphs: 2, sentenceMin: 4, sentenceMax: 6 })}`,
        },
      },
    );
  typia.assert(textContentOne);
  const linkPostOne =
    await generate_random_community_platform_member_posts_create(
      memberOneConnection,
      {
        body: {
          title: `${searchKeyword} ${authorKeyword} link primary ${RandomGenerator.paragraph({ sentences: 3 })}`,
          community_platform_community_id: communityTwo.id,
          post_type: "link",
        },
      },
    );
  typia.assert(linkPostOne);
  const linkContentOne =
    await generate_random_community_platform_member_posts_links_create(
      memberOneConnection,
      {
        params: { postId: linkPostOne.id },
        body: {
          target_url: `https://www.${RandomGenerator.alphabets(8)}.com/${searchKeyword}/${RandomGenerator.alphabets(6)}`,
        },
      },
    );
  typia.assert(linkContentOne);
  const textPostTwo =
    await generate_random_community_platform_member_posts_create(
      memberTwoConnection,
      {
        body: {
          title: `${extraKeyword} text secondary ${RandomGenerator.paragraph({ sentences: 3 })}`,
          community_platform_community_id: communityTwo.id,
          post_type: "text",
        },
      },
    );
  typia.assert(textPostTwo);
  const textContentTwo =
    await generate_random_community_platform_member_posts_texts_create(
      memberTwoConnection,
      {
        params: { postId: textPostTwo.id },
        body: {
          body: `${extraKeyword} ${RandomGenerator.content({ paragraphs: 2, sentenceMin: 4, sentenceMax: 6 })}`,
        },
      },
    );
  typia.assert(textContentTwo);
  const linkPostTwo =
    await generate_random_community_platform_member_posts_create(
      memberTwoConnection,
      {
        body: {
          title: `baseline link ${RandomGenerator.paragraph({ sentences: 3 })}`,
          community_platform_community_id: communityOne.id,
          post_type: "link",
        },
      },
    );
  typia.assert(linkPostTwo);
  const linkContentTwo =
    await generate_random_community_platform_member_posts_links_create(
      memberTwoConnection,
      {
        params: { postId: linkPostTwo.id },
        body: {
          target_url: `https://www.${RandomGenerator.alphabets(7)}.net/${extraKeyword}/${RandomGenerator.alphabets(5)}`,
        },
      },
    );
  typia.assert(linkContentTwo);
  const guestConnection: api.IConnection = { host: connection.host };
  const byAuthor = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: {
        author_code: memberOneAuth.code,
        sort: "new",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(byAuthor);
  TestValidator.predicate(
    "author filter returns member one posts",
    byAuthor.data.length >= 2,
  );
  TestValidator.predicate(
    "author filter excludes other authors",
    byAuthor.data.every((post) => post.author.code === memberOneAuth.code),
  );
  const byCommunity = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: {
        community_slug: communityOne.slug,
        sort: "new",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(byCommunity);
  TestValidator.predicate(
    "community filter returns target community posts",
    byCommunity.data.length >= 2,
  );
  TestValidator.predicate(
    "community filter excludes other communities",
    byCommunity.data.every((post) => post.community.slug === communityOne.slug),
  );
  const byType = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: {
        post_type: "text",
        sort: "new",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(byType);
  TestValidator.predicate(
    "post type filter returns text posts only",
    byType.data.length >= 2,
  );
  TestValidator.predicate(
    "post type filter excludes non-text posts",
    byType.data.every((post) => post.post_type === "text"),
  );
  const bySearch = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: {
        search: searchKeyword,
        sort: "new",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(bySearch);
  TestValidator.predicate(
    "search narrows to keyword matches",
    bySearch.data.length >= 1,
  );
  TestValidator.predicate(
    "search results titles match seeded keyword",
    bySearch.data.every((post) => post.title.includes(searchKeyword)),
  );
  TestValidator.predicate(
    "search includes seeded keyword posts",
    ArrayUtil.has(
      bySearch.data,
      (post) => post.id === textPostOne.id || post.id === linkPostOne.id,
    ),
  );
  const sorted = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(sorted);
  TestValidator.predicate(
    "sort new orders posts by descending creation time",
    sorted.data.every((post, index, array) =>
      index === 0
        ? true
        : new Date(array[index - 1].created_at).getTime() >=
          new Date(post.created_at).getTime(),
    ),
  );
  const pageRequest = {
    sort: "new" as const,
    page: 1,
    limit: 2,
  } satisfies ICommunityPlatformPost.IRequest;
  const pageOneFirst = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: pageRequest,
    },
  );
  typia.assert(pageOneFirst);
  const pageOneSecond = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: pageRequest,
    },
  );
  typia.assert(pageOneSecond);
  TestValidator.equals(
    "identical page request keeps stable page boundaries",
    pageOneFirst.data.map((post) => post.id),
    pageOneSecond.data.map((post) => post.id),
  );
  const combinedFilter = await api.functional.communityPlatform.posts.index(
    guestConnection,
    {
      body: {
        author_code: memberOneAuth.code,
        community_slug: communityOne.slug,
        post_type: "text",
        search: searchKeyword,
        sort: "new",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filters return at least one targeted post",
    combinedFilter.data.length >= 1,
  );
  TestValidator.predicate(
    "combined filters include targeted seeded post",
    ArrayUtil.has(combinedFilter.data, (post) => post.id === textPostOne.id),
  );
  TestValidator.predicate(
    "combined filters exclude non-matching posts",
    combinedFilter.data.every(
      (post) =>
        post.author.code === memberOneAuth.code &&
        post.community.slug === communityOne.slug &&
        post.post_type === "text" &&
        post.title.includes(searchKeyword),
    ),
  );
}
