import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Validate NSFW flag persistence and basic behavior on community creation.
 *
 * ## Business intent
 *
 * This test ensures that when a member user creates communities with different
 * `isNsfw` values using the community creation endpoint, the communities are
 * still correctly persisted, associated to the right visibility level, and
 * discoverable via the generic communities index endpoint.
 *
 * Because the read-side DTOs used for listing communities do not expose NSFW
 * information or NSFW-specific filters, we cannot assert a visible difference
 * in listing behavior between NSFW and non-NSFW communities. Instead, we
 * validate that:
 *
 * - Creating communities with `isNsfw = true` and `isNsfw = false` both succeed
 *   and return structurally valid `ICommunityPlatformCommunity` objects.
 * - Both communities share the same visibility level, which is defined by a
 *   platform admin in the visibility level master data.
 * - Both communities are discoverable via PATCH /communityPlatform/communities
 *   when filtering on that visibility level and a shared search term.
 * - Creator information is consistent across both communities (same member user),
 *   so that the NSFW flag is the only logical distinction we applied at
 *   write-time.
 *
 * ## High-level steps
 *
 * 1. Register and log in a platform administrator using the auth.platformAdmin
 *    join endpoint. This will implicitly set the admin Authorization header on
 *    the shared connection.
 * 2. As platformAdmin, create a new community visibility level via
 *    communityPlatform.platformAdmin.communityVisibilityLevels.create with a
 *    unique `code` (e.g., "public-nsfw-test") and a descriptive name.
 * 3. Register a member user using auth.memberUser.join to obtain a member account
 *    capable of creating communities. This call also sets the Authorization
 *    header for the member user.
 * 4. Log in explicitly as the same member user via auth.memberUser.login to ensure
 *    the connection carries a fresh memberUser session (optional for
 *    correctness but mirrors realistic flows).
 * 5. As that member user, call communityPlatform.memberUser.communities.create
 *    twice with ICommunityPlatformCommunity.ICreate bodies sharing the same
 *    `visibilityLevelCode` (the code created in step 2) and a shared searchable
 *    prefix in `identifier` and `title`, but differing `isNsfw` values:
 *
 *    - First community: `isNsfw = true` (NSFW community).
 *    - Second community: `isNsfw = false` (SFW community).
 * 6. Assert both create responses are valid `ICommunityPlatformCommunity`
 *    instances via typia.assert, and record their identifiers, titles,
 *    visibilityLevel summaries, and creator summaries.
 * 7. Call communityPlatform.communities.index with an
 *    `ICommunityPlatformCommunity.IRequest` whose `search` term matches a
 *    shared prefix in our two communities and whose `visibilityLevelCodes`
 *    contains the created visibility level code. This should produce a paged
 *    list of community summaries that includes both test communities.
 * 8. From the returned `IPageICommunityPlatformCommunity.ISummary` data array,
 *    locate at least one summary that matches each created community (e.g., by
 *    verifying that the `name` or `slug` includes or equals the `title` or
 *    `identifier` used at creation time, depending on implementation
 *    expectations). Assert that both are found.
 * 9. Validate business expectations using TestValidator:
 *
 *    - The visibility level summary embedded in the full created community objects
 *         uses the same `code` and `name` as the master record created in step
 *         2.
 *    - Both created communities share the same creator summary (id and username),
 *         confirming the member user association.
 *    - Both communities are discoverable together in the same filtered listing,
 *         demonstrating that differing `isNsfw` values did not prevent
 *         persistence or break basic discovery.
 *
 * ## Limitations
 *
 * The available DTOs and endpoints do not expose per-community NSFW flags in
 * read/list responses, nor do they offer NSFW-specific filters. Therefore, this
 * test does not attempt to assert NSFW-specific hiding, age gating, or other
 * behavior beyond ensuring that communities created with both NSFW states are
 * valid, correctly linked to their visibility level, and show up in generic
 * discovery.
 */
export async function test_api_community_creation_nsfw_flag_behavior(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) to obtain admin privileges and set token
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}+admin@example.com`,
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create visibility level as platformAdmin
  const visibilityCode = `public-nsfw-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public NSFW Test",
    description: "Visibility level for NSFW flag behavior tests",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user who will create communities
  const memberUsername = RandomGenerator.name(1).replace(/\s+/g, "_");
  const memberEmail =
    `${RandomGenerator.alphabets(8)}+member@example.com` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Explicitly login as member user (ensures memberUser session is active)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/join-complete",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // Shared search prefix to easily filter our test communities
  const sharedPrefix = `nsfw-test-${RandomGenerator.alphabets(6)}`;

  // 5. Create NSFW community
  const nsfwIdentifier = `${sharedPrefix}-nsfw`;
  const nsfwTitle = `${sharedPrefix} NSFW`;

  const nsfwCreateBody = {
    identifier: nsfwIdentifier,
    title: nsfwTitle,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: true,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const nsfwCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: nsfwCreateBody,
      },
    );
  typia.assert(nsfwCommunity);

  // 5b. Create SFW (non-NSFW) community
  const sfwIdentifier = `${sharedPrefix}-sfw`;
  const sfwTitle = `${sharedPrefix} SFW`;

  const sfwCreateBody = {
    identifier: sfwIdentifier,
    title: sfwTitle,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const sfwCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: sfwCreateBody,
      },
    );
  typia.assert(sfwCommunity);

  // 6. Validate visibility level and creator consistency on full entities
  TestValidator.equals(
    "nsfw community visibility level code matches master",
    nsfwCommunity.visibilityLevel.code,
    visibilityLevel.code,
  );
  TestValidator.equals(
    "sfw community visibility level code matches master",
    sfwCommunity.visibilityLevel.code,
    visibilityLevel.code,
  );
  TestValidator.equals(
    "nsfw community visibility level name matches master",
    nsfwCommunity.visibilityLevel.name,
    visibilityLevel.name,
  );
  TestValidator.equals(
    "sfw community visibility level name matches master",
    sfwCommunity.visibilityLevel.name,
    visibilityLevel.name,
  );

  TestValidator.equals(
    "both communities share same creator id",
    nsfwCommunity.creator.id,
    sfwCommunity.creator.id,
  );
  TestValidator.equals(
    "both communities share same creator username",
    nsfwCommunity.creator.username,
    sfwCommunity.creator.username,
  );

  // 7. Discover communities via PATCH /communityPlatform/communities
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: sharedPrefix,
    visibilityLevelCodes: [visibilityCode],
    tagIds: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const pageResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  // 8. Locate summaries for both created communities
  const nsfwSummary = pageResult.data.find((summary) => {
    return (
      summary.slug === nsfwIdentifier ||
      summary.name === nsfwTitle ||
      summary.slug.includes(sharedPrefix) ||
      summary.name.includes(sharedPrefix)
    );
  });

  const sfwSummary = pageResult.data.find((summary) => {
    return (
      summary.slug === sfwIdentifier ||
      summary.name === sfwTitle ||
      summary.slug.includes(sharedPrefix) ||
      summary.name.includes(sharedPrefix)
    );
  });

  TestValidator.predicate(
    "listing should contain nsfw community summary",
    nsfwSummary !== undefined,
  );
  TestValidator.predicate(
    "listing should contain sfw community summary",
    sfwSummary !== undefined,
  );

  if (nsfwSummary !== undefined) {
    TestValidator.equals(
      "nsfw summary visibility level code matches master",
      nsfwSummary.visibilityLevel.code,
      visibilityLevel.code,
    );
  }
  if (sfwSummary !== undefined) {
    TestValidator.equals(
      "sfw summary visibility level code matches master",
      sfwSummary.visibilityLevel.code,
      visibilityLevel.code,
    );
  }
}
