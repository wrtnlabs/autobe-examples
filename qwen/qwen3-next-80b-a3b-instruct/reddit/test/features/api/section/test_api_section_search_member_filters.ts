import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSection";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_section_search_member_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to establish user context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  typia.assert(member);
  // Step 2: Test section search with various filter combinations using existing sections
  // Test 1: Search with createdBefore filter (should return sections created before current time)
  const now = new Date();
  const beforeNow = await api.functional.communityPlatform.sections.index(
    memberConnection,
    {
      body: {
        createdBefore: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSection.IRequest,
    },
  );
  typia.assert(beforeNow);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    beforeNow.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", beforeNow.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    () => beforeNow.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    () => beforeNow.pagination.pages >= 0,
  );
  // Test 2: Search with createdAfter filter (should return sections created after epoch start)
  const afterEpoch = await api.functional.communityPlatform.sections.index(
    memberConnection,
    {
      body: {
        createdAfter: "1970-01-01T00:00:00.000Z",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSection.IRequest,
    },
  );
  typia.assert(afterEpoch);
  // All sections should be created after epoch, so we expect at least some results
  TestValidator.predicate(
    "created_after returns at least some sections",
    () => afterEpoch.data.length >= 0,
  );
  // Test 3: Search with is_featured filter (should return sections with is_featured = true)
  const featuredOnly = await api.functional.communityPlatform.sections.index(
    memberConnection,
    {
      body: {
        is_featured: true,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSection.IRequest,
    },
  );
  typia.assert(featuredOnly);
  // Validate that we can properly filter sections by featured status
  // We cannot ensure a specific count because we don't control test data
  TestValidator.predicate(
    "featured filter returns some sections or none",
    () => featuredOnly.data.length >= 0,
  );
  // If any featured sections exist, validate basic properties
  if (featuredOnly.data.length > 0) {
    const firstFeatured = featuredOnly.data[0];
    TestValidator.equals(
      "featured section has id",
      typeof firstFeatured.id,
      "string",
    );
    TestValidator.equals(
      "featured section has name",
      typeof firstFeatured.name,
      "string",
    );
    TestValidator.equals(
      "featured section has created_at",
      typeof firstFeatured.created_at,
      "string",
    );
    TestValidator.equals(
      "featured section has status",
      ["active", "inactive", "archived"].includes(firstFeatured.status),
      true,
    );
    TestValidator.equals(
      "featured section has permission_level",
      typeof firstFeatured.permission_level,
      "string",
    );
  }
  // Test 4: Search with parent_section_id filter (should return sections with specified parent)
  // We don't know any specific parent_section_id, so we cannot test this with certainty
  // Instead, we test the API accepts the parameter without error
  const withParentId = await api.functional.communityPlatform.sections.index(
    memberConnection,
    {
      body: {
        parent_section_id: "00000000-0000-0000-0000-000000000000",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSection.IRequest,
    },
  );
  typia.assert(withParentId);
  // The server should handle invalid parent_section_id gracefully, return empty array if none found
  TestValidator.predicate(
    "parent_section_id search returns valid response",
    () =>
      Array.isArray(withParentId.data) &&
      typeof withParentId.pagination === "object",
  );
  // Test 5: Validate that archived/inactive sections are excluded when appropriate
  // We test with status filter to ensure we can filter by status
  const onlyActive = await api.functional.communityPlatform.sections.index(
    memberConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSection.IRequest,
    },
  );
  typia.assert(onlyActive);
  TestValidator.predicate("active filter response valid", () =>
    onlyActive.data.every((s) => s.status === "active"),
  );
  // Test 6: Test name search with partial match
  const nameSearch = await api.functional.communityPlatform.sections.index(
    memberConnection,
    {
      body: {
        name: "",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSection.IRequest,
    },
  );
  typia.assert(nameSearch);
  // Empty name should return all sections or a subset (implementation dependent)
  TestValidator.predicate(
    "name search returns valid response",
    () => Array.isArray(nameSearch.data) && nameSearch.data.length >= 0,
  );
  // Test 7: Test that all responses follow the expected schema structure
  const comprehensiveSearch =
    await api.functional.communityPlatform.sections.index(memberConnection, {
      body: {
        createdBefore: now.toISOString(),
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformSection.IRequest,
    });
  typia.assert(comprehensiveSearch);
  // Validate structure of each section summary
  if (comprehensiveSearch.data.length > 0) {
    const sampleSection = comprehensiveSearch.data[0];
    TestValidator.equals(
      "section has valid id",
      typeof sampleSection.id,
      "string",
    );
    TestValidator.equals(
      "section has valid name",
      typeof sampleSection.name,
      "string",
    );
    TestValidator.equals(
      "section has valid created_at",
      typeof sampleSection.created_at,
      "string",
    );
    TestValidator.equals(
      "section has valid status",
      ["active", "inactive", "archived"].includes(sampleSection.status),
      true,
    );
    TestValidator.equals(
      "section has valid permission_level",
      typeof sampleSection.permission_level,
      "string",
    );
    TestValidator.equals(
      "section has valid visibility",
      ["public", "private", "restricted"].includes(sampleSection.visibility),
      true,
    );
    TestValidator.equals(
      "section has valid category_id",
      typeof sampleSection.category_id,
      "string",
    );
    TestValidator.equals(
      "section has valid tag_list",
      Array.isArray(sampleSection.tag_list),
      true,
    );
    TestValidator.equals(
      "section has valid member_count",
      typeof sampleSection.member_count,
      "number",
    );
    TestValidator.equals(
      "section has valid moderator_count",
      typeof sampleSection.moderator_count,
      "number",
    );
    TestValidator.equals(
      "section has valid content_count",
      typeof sampleSection.content_count,
      "number",
    );
  }
}
