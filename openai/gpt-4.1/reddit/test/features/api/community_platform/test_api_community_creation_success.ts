import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful creation of a new community by an authenticated member.
 *
 * Steps:
 *
 * 1. Register a new platform member (unique email/password)
 * 2. Authentication context is set automatically by join
 * 3. Create a unique community with all required fields and valid formatting
 *
 *    - Unique name (3-100 chars, case-insensitive)
 *    - Title (3-100 chars)
 *    - Slug (unique, URL-safe)
 *    - Description (10-10000 chars or undefined/null)
 * 4. Validate that the response object:
 *
 *    - Links creator_member_id to the authenticated member
 *    - Fields (name, title, slug, description) match input
 *    - Has status (e.g. 'active'), created_at, updated_at timestamps
 *    - Deleted_at is null/undefined
 * 5. Business rules: uniqueness of name/slug, formatting constraints, correct
 *    field linkage in output
 */
export async function test_api_community_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new platform member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. [Authentication context is set]
  // Already handled by join - the context is current

  // 3. Prepare and create a unique community
  const name = RandomGenerator.alphaNumeric(12).toLowerCase(); // 12 chars, URL-friendly
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const slug = RandomGenerator.alphaNumeric(12).toLowerCase(); // URL-safe
  const description = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 16,
    wordMin: 3,
    wordMax: 8,
  });
  const communityBody = {
    name,
    title,
    slug,
    description,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 4. Validate that the output matches all expectations
  TestValidator.equals(
    "community name should match input",
    community.name,
    name,
  );
  TestValidator.equals(
    "community title should match input",
    community.title,
    title,
  );
  TestValidator.equals(
    "community description should match input",
    community.description,
    description,
  );
  TestValidator.equals(
    "community slug should match input",
    community.slug,
    slug,
  );
  TestValidator.equals(
    "creator_member_id should match current member id",
    community.creator_member_id,
    member.id,
  );
  TestValidator.predicate(
    "community id should be uuid",
    typeof community.id === "string" && /[0-9a-f-]{36}/i.test(community.id),
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    community.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "created_at should be valid date-time ISO",
    typeof community.created_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        community.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at should be valid date-time ISO",
    typeof community.updated_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        community.updated_at,
      ),
  );
  TestValidator.predicate(
    "status should be non-empty string",
    typeof community.status === "string" && community.status.length > 0,
  );
}
