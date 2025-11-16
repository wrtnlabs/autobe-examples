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

/**
 * Validate public community retrieval by identifier for guest users.
 *
 * Business goal: Ensure that once a community has been created with a specific
 * public visibility level by a member user, any unauthenticated guest can
 * retrieve its public metadata and configuration using the community
 * identifier. The response must conform to ICommunityPlatformCommunity and
 * preserve key identity and configuration fields.
 *
 * Steps:
 *
 * 1. Register a platform admin and implicitly authenticate them using
 *    /auth/platformAdmin/join.
 * 2. As the platform admin, create a dedicated visibility level (e.g. code
 *    "public-e2e-<random>") via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Register a member user via /auth/memberUser/join, which also authenticates
 *    them.
 * 4. As the member user, create a community via
 *    /communityPlatform/memberUser/communities with a unique identifier, title,
 *    description, and visibilityLevelCode set to the created visibility level.
 * 5. Construct a guest (unauthenticated) connection that does not carry any
 *    Authorization header.
 * 6. Using the guest connection, call GET
 *    /communityPlatform/communities/{communityIdentifier} with the created
 *    community's identifier.
 * 7. Assert that the returned community matches the created one in key fields (id,
 *    identifier, title, visibilityLevel.code) and that flags is_archived and
 *    is_removed are false.
 * 8. Confirm that creator summary matches the member user who created the
 *    community and that created_at/updated_at timestamps are consistent between
 *    create and get responses.
 * 9. Additionally, attempt to fetch the community again using its UUID id as the
 *    communityIdentifier and verify the same record is returned.
 */
export async function test_api_community_get_by_identifier_public_visibility(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin using join
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional and typed as string | undefined, so omit it instead of null
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level master record as platform admin
  const visibilityCodeBase = `public-e2e-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCodeBase,
    name: `Public E2E ${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code must match creation payload",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Register and authenticate member user via join
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create a community as the member user
  const communityIdentifier = `public-test-${RandomGenerator.alphaNumeric(10)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityDescription = RandomGenerator.paragraph({ sentences: 8 });

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: communityDescription,
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    // omit primaryTagIds for simplicity
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community identifier matches request",
    createdCommunity.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "created community title matches request",
    createdCommunity.title,
    communityCreateBody.title,
  );
  TestValidator.equals(
    "created community visibility code matches visibility level",
    createdCommunity.visibilityLevel.code,
    visibilityLevel.code,
  );
  TestValidator.predicate(
    "created community is not archived",
    createdCommunity.is_archived === false,
  );
  TestValidator.predicate(
    "created community is not removed",
    createdCommunity.is_removed === false,
  );

  // 5. Build guest (unauthenticated) connection by clearing headers
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Fetch community by identifier as a guest
  const fetchedByIdentifier: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(guestConnection, {
      communityIdentifier: createdCommunity.identifier,
    });
  typia.assert(fetchedByIdentifier);

  // 7. Validate business expectations and consistency between create and get
  TestValidator.equals(
    "fetched community id matches created id",
    fetchedByIdentifier.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "fetched community identifier matches created identifier",
    fetchedByIdentifier.identifier,
    createdCommunity.identifier,
  );
  TestValidator.equals(
    "fetched community title matches created title",
    fetchedByIdentifier.title,
    createdCommunity.title,
  );
  TestValidator.equals(
    "fetched visibility level code matches created visibility level",
    fetchedByIdentifier.visibilityLevel.code,
    visibilityLevel.code,
  );
  TestValidator.predicate(
    "fetched community is not archived",
    fetchedByIdentifier.is_archived === false,
  );
  TestValidator.predicate(
    "fetched community is not removed",
    fetchedByIdentifier.is_removed === false,
  );
  TestValidator.equals(
    "creator id matches member user id",
    fetchedByIdentifier.creator.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "creator username matches member username",
    fetchedByIdentifier.creator.username,
    memberJoinBody.username,
  );
  TestValidator.equals(
    "created_at timestamp is stable between create and fetch",
    fetchedByIdentifier.created_at,
    createdCommunity.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp is stable between create and fetch",
    fetchedByIdentifier.updated_at,
    createdCommunity.updated_at,
  );

  // 8. Optional: fetch the same community by UUID id as identifier
  const fetchedById: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(guestConnection, {
      communityIdentifier: createdCommunity.id,
    });
  typia.assert(fetchedById);

  TestValidator.equals(
    "fetch by id returns same community id",
    fetchedById.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "fetch by id returns same community identifier",
    fetchedById.identifier,
    createdCommunity.identifier,
  );
}
