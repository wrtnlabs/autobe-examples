import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_moderator_appointment_response_completeness(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 2. Create a category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 3. Create community creator member
  const creatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const creator = await api.functional.auth.member.join(connection, {
    body: creatorData,
  });
  typia.assert(creator);

  // 4. Create member to be appointed as moderator
  const moderatorCandidateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const moderatorCandidate = await api.functional.auth.member.join(connection, {
    body: moderatorCandidateData,
  });
  typia.assert(moderatorCandidate);

  // 5. Create community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 6. Appoint moderator
  const appointmentData = {
    memberId: moderatorCandidate.id,
    tier: "senior",
  } satisfies ICommunityPlatformCommunityModerator.ICreate;

  const moderator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: appointmentData,
      },
    );
  typia.assert(moderator);

  // 7. Verify all required fields exist in response
  TestValidator.predicate(
    "moderator has id field",
    moderator.id !== undefined && moderator.id !== null,
  );
  TestValidator.predicate(
    "moderator id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );

  TestValidator.predicate(
    "moderator has community field",
    moderator.community !== undefined && moderator.community !== null,
  );
  TestValidator.predicate(
    "community has id",
    moderator.community.id !== undefined,
  );
  TestValidator.predicate(
    "community has identifier",
    moderator.community.identifier !== undefined,
  );
  TestValidator.predicate(
    "community has name",
    moderator.community.name !== undefined,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof moderator.community.subscriber_count === "number",
  );
  TestValidator.predicate(
    "community has post_count",
    typeof moderator.community.post_count === "number",
  );
  TestValidator.predicate(
    "community has created_at",
    moderator.community.created_at !== undefined,
  );

  TestValidator.predicate(
    "moderator has member field",
    moderator.member !== undefined && moderator.member !== null,
  );
  TestValidator.predicate("member has id", moderator.member.id !== undefined);
  TestValidator.predicate(
    "member has username",
    moderator.member.username !== undefined,
  );
  TestValidator.predicate(
    "member has email",
    moderator.member.email !== undefined,
  );
  TestValidator.predicate(
    "member has email_verified",
    typeof moderator.member.email_verified === "boolean",
  );
  TestValidator.predicate(
    "member has account_status",
    moderator.member.account_status !== undefined,
  );
  TestValidator.predicate(
    "member has karma_score",
    typeof moderator.member.karma_score === "number",
  );
  TestValidator.predicate(
    "member has created_at",
    moderator.member.created_at !== undefined,
  );

  TestValidator.predicate(
    "moderator has tier field",
    moderator.moderator_tier !== undefined,
  );
  TestValidator.equals(
    "moderator tier is senior",
    moderator.moderator_tier,
    "senior",
  );

  TestValidator.predicate(
    "moderator has appointed_at timestamp",
    moderator.appointed_at !== undefined && moderator.appointed_at !== null,
  );
  TestValidator.predicate(
    "appointed_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      moderator.appointed_at,
    ),
  );

  TestValidator.predicate(
    "moderator has created_at timestamp",
    moderator.created_at !== undefined && moderator.created_at !== null,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      moderator.created_at,
    ),
  );

  TestValidator.predicate(
    "moderator has removed_at field",
    "removed_at" in moderator,
  );
  TestValidator.equals(
    "removed_at is null for new appointment",
    moderator.removed_at,
    null,
  );

  // 8. Verify timestamps are reasonable (appointed_at and created_at should be close in time)
  const appointedTime = new Date(moderator.appointed_at).getTime();
  const createdTime = new Date(moderator.created_at).getTime();
  TestValidator.predicate(
    "appointed_at and created_at are within 5 seconds",
    Math.abs(appointedTime - createdTime) < 5000,
  );

  // 9. Verify community and member references match
  TestValidator.equals(
    "community id matches",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "member id matches",
    moderator.member.id,
    moderatorCandidate.id,
  );
}
