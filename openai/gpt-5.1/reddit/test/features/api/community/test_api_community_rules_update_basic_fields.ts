import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate updating only title and body of a community rules document.
 *
 * This test covers the happy-path workflow for a member user to:
 *
 * 1. Join the platform and obtain an authenticated session
 * 2. Create a community
 * 3. Create an initial rules document for that community
 * 4. Update the rules document by changing only title and body
 *
 * Business expectations validated by this test:
 *
 * - Updating title/body via ICommunityPlatformCommunityRule.IUpdate does not
 *   change version or isActive when those fields are omitted from the payload.
 * - The rule remains associated with the same community summary.
 * - UpdatedAt is bumped forward compared to the original rules record.
 */
export async function test_api_community_rules_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
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
  typia.assert(community);

  // 3. Create an initial rules document for the community
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialBody = RandomGenerator.content({ paragraphs: 2 });

  const ruleCreateBody = {
    title: initialTitle,
    body: initialBody,
    version: 1 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.create(
      connection,
      {
        communitySlug: community.slug,
        body: ruleCreateBody,
      },
    );
  typia.assert(createdRule);

  // Snapshot original fields that must remain unchanged
  const originalVersion = createdRule.version;
  const originalIsActive = createdRule.isActive;
  const originalUpdatedAt = createdRule.updatedAt;
  const originalCommunityId = createdRule.community.id;
  const originalCommunitySlug = createdRule.community.slug;

  // 4. Update only title and body via ICommunityPlatformCommunityRule.IUpdate
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });

  const updateBody = {
    title: updatedTitle,
    body: updatedBody,
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const updatedRule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.memberUser.communities.rules.update(
      connection,
      {
        communitySlug: community.slug,
        ruleId: createdRule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);

  // 5. Assertions on updated rule
  TestValidator.equals(
    "updated rule title should reflect new value",
    updatedRule.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated rule body should reflect new value",
    updatedRule.body,
    updatedBody,
  );

  TestValidator.equals(
    "rule version should remain unchanged when not provided in update",
    updatedRule.version,
    originalVersion,
  );
  TestValidator.equals(
    "rule isActive should remain unchanged when not provided in update",
    updatedRule.isActive,
    originalIsActive,
  );

  TestValidator.equals(
    "community id should remain associated with same community",
    updatedRule.community.id,
    originalCommunityId,
  );
  TestValidator.equals(
    "community slug should remain associated with same community",
    updatedRule.community.slug,
    originalCommunitySlug,
  );

  // Compare updatedAt lexicographically assuming ISO 8601 date-time strings
  const updatedAtIsLater = updatedRule.updatedAt > originalUpdatedAt;
  TestValidator.predicate(
    "updatedAt should be greater than original updatedAt after update",
    updatedAtIsLater,
  );

  // Internal consistency check to ensure at least one field actually changed
  TestValidator.predicate(
    "at least title or body should differ from original",
    updatedRule.title !== initialTitle || updatedRule.body !== initialBody,
  );
}
