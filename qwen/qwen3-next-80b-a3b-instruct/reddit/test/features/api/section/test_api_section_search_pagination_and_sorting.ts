import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSection";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_section_search_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  // Generate multiple test sections with varying criteria
  const sections: ICommunityPlatformSection.ISummary[] = [];
  const sectionNames = [
    "Technology",
    "Arts",
    "Sports",
    "Science",
    "Music",
    "Health",
    "Travel",
    "Food",
    "Education",
    "Business",
  ];
  const sectionCategories = [
    "Tech",
    "Culture",
    "Sports",
    "Science",
    "Art",
    "Wellness",
    "Adventure",
    "Cuisine",
    "Learning",
    "Finance",
  ];
  // Create 150 sections to ensure pagination testing with multiple pages
  for (let i = 0; i < 150; i++) {
    const randomName = RandomGenerator.pick(sectionNames);
    const randomCategory = RandomGenerator.pick(sectionCategories);
    // Mock creation time: spread from 2023 to 2024
    const createdDate = new Date();
    createdDate.setFullYear(2023 + Math.floor(i / 30)); // 30 sections per year
    createdDate.setMonth(Math.floor(i / 5) % 12);
    createdDate.setDate((i % 28) + 1);
    // Create sections with varying member counts for sorting tests
    const memberCount = Math.floor(i / 10) * 5; // Increment member count every 10 sections
    // Add section with realistic data
    sections.push({
      id: typia.random<string & tags.Format<"uuid">>(),
      name: randomName + " " + i,
      description: `Description for ${randomName} section ${i}`,
      created_at: createdDate.toISOString(),
      status: i % 3 === 0 ? "archived" : i % 2 === 0 ? "inactive" : "active",
      permission_level: "member",
      visibility: "public",
      category_id: typia.random<string & tags.Format<"uuid">>(),
      tag_list: [randomCategory, "popular"],
      member_count: memberCount,
      moderator_count: Math.floor(memberCount / 10),
      content_count: memberCount * 5,
    });
  }
  // Store the full ordered list to validate against later
  // Sort sections by name (ascending)
  const sortedByNameAsc = [...sections].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  // Sort sections by created_at (descending)
  const sortedByCreatedAtDesc = [...sections].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // Sort sections by member_count (ascending)
  const sortedByMemberCountAsc = [...sections].sort(
    (a, b) => a.member_count - b.member_count,
  );
  // Test 1: Basic pagination - page=1, limit=1 should return first section
  const page1Limit1Response: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 1,
      },
    });
  typia.assert(page1Limit1Response);
  TestValidator.equals(
    "page 1, limit 1 should return one section",
    page1Limit1Response.data.length,
    1,
  );
  TestValidator.equals(
    "pagination total records matches",
    page1Limit1Response.pagination.records,
    sections.length,
  );
  TestValidator.equals(
    "pagination pages calculation",
    page1Limit1Response.pagination.pages,
    Math.ceil(sections.length / 1),
  );
  TestValidator.equals(
    "page 1, limit 1 should contain first section (by sort default)",
    page1Limit1Response.data[0].name,
    sortedByCreatedAtDesc[0].name,
  );
  // Test 2: Maximum limit - page=1, limit=100 should return 100 sections
  const page1Limit100Response: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
      },
    });
  typia.assert(page1Limit100Response);
  TestValidator.equals(
    "page 1, limit 100 should return 100 sections",
    page1Limit100Response.data.length,
    100,
  );
  TestValidator.equals(
    "pagination total records matches for limit 100",
    page1Limit100Response.pagination.records,
    sections.length,
  );
  TestValidator.equals(
    "pagination pages with limit 100",
    page1Limit100Response.pagination.pages,
    Math.ceil(sections.length / 100),
  );
  // Test 3: Boundary page - page=2, limit=100 should return remaining sections (50 sections)
  const page2Limit100Response: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 2,
        limit: 100,
      },
    });
  typia.assert(page2Limit100Response);
  TestValidator.equals(
    "page 2, limit 100 should return remaining 50 sections",
    page2Limit100Response.data.length,
    50,
  );
  // Test 4: Page beyond total pages - should return empty array
  const page3Limit100Response: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 3,
        limit: 100,
      },
    });
  typia.assert(page3Limit100Response);
  TestValidator.equals(
    "page beyond total pages should return empty array",
    page3Limit100Response.data.length,
    0,
  );
  TestValidator.equals(
    "pagination pages should still reflect total pages",
    page3Limit100Response.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination records should still reflect total records",
    page3Limit100Response.pagination.records,
    sections.length,
  );
  // Test 5: Sort by name ascending
  const sortedByNameAscResponse: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
        sortBy: "name",
        order: "asc",
      },
    });
  typia.assert(sortedByNameAscResponse);
  TestValidator.equals(
    "sort by name ascending should match expected ordering",
    sortedByNameAscResponse.data.length,
    sortedByNameAsc.length,
  );
  const first10Names = sortedByNameAsc.slice(0, 10).map((s) => s.name);
  const returnedFirst10Names = sortedByNameAscResponse.data
    .slice(0, 10)
    .map((s) => s.name);
  TestValidator.equals(
    "first 10 sections in name ascending sort",
    returnedFirst10Names,
    first10Names,
  );
  // Test 6: Sort by name descending
  const sortedByNameDescResponse: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
        sortBy: "name",
        order: "desc",
      },
    });
  typia.assert(sortedByNameDescResponse);
  TestValidator.equals(
    "sort by name descending should match expected ordering",
    sortedByNameDescResponse.data.length,
    sortedByNameAsc.length,
  );
  const first10NamesDesc = sortedByNameAsc
    .slice()
    .reverse()
    .slice(0, 10)
    .map((s) => s.name);
  const returnedFirst10NamesDesc = sortedByNameDescResponse.data
    .slice(0, 10)
    .map((s) => s.name);
  TestValidator.equals(
    "first 10 sections in name descending sort",
    returnedFirst10NamesDesc,
    first10NamesDesc,
  );
  // Test 7: Sort by created_at ascending
  const sortedByCreatedAtAscResponse: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
        sortBy: "created_at",
        order: "asc",
      },
    });
  typia.assert(sortedByCreatedAtAscResponse);
  TestValidator.equals(
    "sort by created_at ascending should match expected ordering",
    sortedByCreatedAtAscResponse.data.length,
    sections.length,
  );
  const sortedByCreatedAtAsc = [...sections].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const first10CreatedAsc = sortedByCreatedAtAsc
    .slice(0, 10)
    .map((s) => s.created_at);
  const returnedFirst10CreatedAsc = sortedByCreatedAtAscResponse.data
    .slice(0, 10)
    .map((s) => s.created_at);
  TestValidator.equals(
    "first 10 sections in created_at ascending sort",
    returnedFirst10CreatedAsc,
    first10CreatedAsc,
  );
  // Test 8: Sort by created_at descending (default)
  const sortedByCreatedAtDescResponse: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
        sortBy: "created_at",
        order: "desc",
      },
    });
  typia.assert(sortedByCreatedAtDescResponse);
  TestValidator.equals(
    "sort by created_at descending should match expected ordering",
    sortedByCreatedAtDescResponse.data.length,
    sortedByCreatedAtDesc.length,
  );
  const first10CreatedDesc = sortedByCreatedAtDesc
    .slice(0, 10)
    .map((s) => s.created_at);
  const returnedFirst10CreatedDesc = sortedByCreatedAtDescResponse.data
    .slice(0, 10)
    .map((s) => s.created_at);
  TestValidator.equals(
    "first 10 sections in created_at descending sort",
    returnedFirst10CreatedDesc,
    first10CreatedDesc,
  );
  // Test 9: Sort by member_count ascending
  const sortedByMemberCountAscResponse: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
        sortBy: "member_count",
        order: "asc",
      },
    });
  typia.assert(sortedByMemberCountAscResponse);
  TestValidator.equals(
    "sort by member_count ascending should match expected ordering",
    sortedByMemberCountAscResponse.data.length,
    sortedByMemberCountAsc.length,
  );
  const first10MemberCountAsc = sortedByMemberCountAsc
    .slice(0, 10)
    .map((s) => s.member_count);
  const returnedFirst10MemberCountAsc = sortedByMemberCountAscResponse.data
    .slice(0, 10)
    .map((s) => s.member_count);
  TestValidator.equals(
    "first 10 sections in member_count ascending sort",
    returnedFirst10MemberCountAsc,
    first10MemberCountAsc,
  );
  // Test 10: Sort by member_count descending
  const sortedByMemberCountDescResponse: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
        sortBy: "member_count",
        order: "desc",
      },
    });
  typia.assert(sortedByMemberCountDescResponse);
  TestValidator.equals(
    "sort by member_count descending should match expected ordering",
    sortedByMemberCountDescResponse.data.length,
    sortedByMemberCountAsc.length,
  );
  const first10MemberCountDesc = sortedByMemberCountAsc
    .slice()
    .reverse()
    .slice(0, 10)
    .map((s) => s.member_count);
  const returnedFirst10MemberCountDesc = sortedByMemberCountDescResponse.data
    .slice(0, 10)
    .map((s) => s.member_count);
  TestValidator.equals(
    "first 10 sections in member_count descending sort",
    returnedFirst10MemberCountDesc,
    first10MemberCountDesc,
  );
  // Test 11: Edge case - minimum limit value of 1
  const limit1Response: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 1,
      },
    });
  typia.assert(limit1Response);
  TestValidator.equals(
    "minimum limit value of 1 should work",
    limit1Response.data.length,
    1,
  );
  // Test 12: Edge case - maximum limit value of 100
  const limit100Response: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
      },
    });
  typia.assert(limit100Response);
  TestValidator.equals(
    "maximum limit value of 100 should work",
    limit100Response.data.length,
    100,
  );
  // Test 13: No sorting - should default to created_at descending
  const noSortingResponse: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(noSortingResponse);
  const first10Default = sortedByCreatedAtDesc.slice(0, 10).map((s) => s.name);
  const first10Returned = noSortingResponse.data
    .slice(0, 10)
    .map((s) => s.name);
  TestValidator.equals(
    "no sorting should default to created_at descending",
    first10Returned,
    first10Default,
  );
}
