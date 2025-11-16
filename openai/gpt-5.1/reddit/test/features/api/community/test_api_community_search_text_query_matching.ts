import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_text_query_matching(
  connection: api.IConnection,
) {
  // 1. Join as a member user so we can create communities as memberUser actor
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create communities with distinctive names and descriptions
  const techCommunityBody = {
    slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
    name: "Tech Discussions",
    description:
      "A community for tech enthusiasts to discuss software engineering, programming languages, and system design.",
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const cookingCommunityBody = {
    slug: `cooking_${RandomGenerator.alphaNumeric(6)}`,
    name: "Cooking Club",
    description:
      "A friendly cooking club sharing recipes and food tips for home chefs.",
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const recipesCommunityBody = {
    slug: `recipes_${RandomGenerator.alphaNumeric(6)}`,
    name: "World Recipes",
    description:
      "Discover and exchange recipes from around the world, including desserts and regional specialties.",
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const techCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: techCommunityBody },
    );
  typia.assert(techCommunity);

  const cookingCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: cookingCommunityBody },
    );
  typia.assert(cookingCommunity);

  const recipesCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: recipesCommunityBody },
    );
  typia.assert(recipesCommunity);

  // 3. Search with term "tech" and verify matching/non-matching behavior
  const searchTechBody = {
    page: 1,
    limit: 20,
    search: "tech",
  } satisfies ICommunityPlatformCommunity.IRequest;

  const techSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: searchTechBody,
    });
  typia.assert(techSearchResult);

  const techSummaries: ICommunityPlatformCommunity.ISummary[] =
    techSearchResult.data;

  // Ensure pagination metadata is coherent
  TestValidator.equals(
    "tech search pagination current page matches request",
    techSearchResult.pagination.current,
    searchTechBody.page ?? 1,
  );
  TestValidator.equals(
    "tech search pagination limit matches request",
    techSearchResult.pagination.limit,
    searchTechBody.limit ?? techSearchResult.pagination.limit,
  );
  TestValidator.predicate(
    "tech search records count >= returned data length",
    techSearchResult.pagination.records >= techSummaries.length,
  );

  // Assert that the tech community is included in search results
  const containsTech = techSummaries.some(
    (summary) => summary.id === techCommunity.id,
  );
  TestValidator.predicate(
    "search for 'tech' includes Tech Discussions community",
    containsTech,
  );

  // Assert that cooking community is not included when searching for "tech"
  const containsCookingInTechSearch = techSummaries.some(
    (summary) => summary.id === cookingCommunity.id,
  );
  TestValidator.predicate(
    "search for 'tech' does not include Cooking Club community",
    !containsCookingInTechSearch,
  );

  // 4. Optionally search with term "recipes" and validate appropriate matches
  const searchRecipesBody = {
    page: 1,
    limit: 20,
    search: "recipes",
  } satisfies ICommunityPlatformCommunity.IRequest;

  const recipesSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: searchRecipesBody,
    });
  typia.assert(recipesSearchResult);

  const recipeSummaries: ICommunityPlatformCommunity.ISummary[] =
    recipesSearchResult.data;

  TestValidator.equals(
    "recipes search pagination current page matches request",
    recipesSearchResult.pagination.current,
    searchRecipesBody.page ?? 1,
  );
  TestValidator.equals(
    "recipes search pagination limit matches request",
    recipesSearchResult.pagination.limit,
    searchRecipesBody.limit ?? recipesSearchResult.pagination.limit,
  );
  TestValidator.predicate(
    "recipes search records count >= returned data length",
    recipesSearchResult.pagination.records >= recipeSummaries.length,
  );

  const containsRecipesCommunity = recipeSummaries.some(
    (summary) => summary.id === recipesCommunity.id,
  );
  TestValidator.predicate(
    "search for 'recipes' includes World Recipes community",
    containsRecipesCommunity,
  );
}
