import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a paginated list of all communities on the platform with
 * default sorting by name alphabetically.
 *
 * Steps:
 * 1. Send PATCH request to /redditClone/communities with empty request body
 * 2. Verify response returns HTTP 200 status
 * 3. Validate response structure includes 'data' array and 'pagination' metadata
 * 4. Verify pagination object contains: current, limit, records, pages
 * 5. Verify each community has required fields: id, name, description, subscriber_count, created_at, owner
 * 6. Verify results are sorted alphabetically by name in ascending order (A-Z)
 * 7. Verify default page size is applied (should be 20 or less)
 * 8. Verify only active communities are returned
 */
export async function test_api_community_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Send PATCH request with empty request body for default listing
  const body: IRedditCloneCommunityBan.IRequest = {};
  const response = await api.functional.redditClone.communities.index(
    connection,
    { body },
  );
  // 2. Validate response structure using typia.assert
  typia.assert(response);
  // 3. Verify response has data array and pagination metadata
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.predicate(
    "response has pagination",
    response.pagination !== null && response.pagination !== undefined,
  );
  // 4. Verify pagination object contains required fields
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination has current page",
    typeof pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof pagination.pages === "number",
  );
  // 5. Verify each community has required fields
  for (const community of response.data) {
    TestValidator.predicate(
      "community has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );
    TestValidator.predicate(
      "community has name",
      typeof community.name === "string" && community.name.length > 0,
    );
    TestValidator.predicate(
      "community has description",
      typeof community.description === "string",
    );
    TestValidator.predicate(
      "community has subscriber_count",
      typeof community.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community has created_at ISO datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        community.created_at,
      ),
    );
    TestValidator.predicate(
      "community has owner with username",
      community.owner !== null &&
        community.owner !== undefined &&
        typeof community.owner.username === "string",
    );
  }
  // 6. Verify results are sorted alphabetically by name (A-Z)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i].name.toLowerCase();
      const next = response.data[i + 1].name.toLowerCase();
      TestValidator.predicate(
        `community ${i} name "${current}" comes before ${i + 1} name "${next}"`,
        current <= next,
      );
    }
  }
  // 7. Verify default page size is applied (limit should be 20 or less)
  TestValidator.predicate(
    "pagination limit is 20 or less",
    pagination.limit <= 20,
  );
  // 8. Verify pagination consistency
  TestValidator.equals(
    "page count matches records and limit",
    Math.ceil(pagination.records / pagination.limit),
    pagination.pages,
  );
}
