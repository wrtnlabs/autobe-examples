import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_user_profile_multiple_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a registered member for consistent retrieval testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const displayName: string = RandomGenerator.name();
  const userBio: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const avatarUrl: string = `https://example.com/avatars/${RandomGenerator.alphaNumeric(8)}.jpg`;
  const status: string = "active";

  const createdMember: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: displayName,
        email: memberEmail,
        bio: userBio,
        avatar_url: avatarUrl,
        status: status,
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(createdMember);

  // Validate the created member has all expected properties
  TestValidator.equals(
    "created member has valid ID",
    createdMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "created member email matches",
    createdMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "created member display name matches",
    createdMember.display_name,
    displayName,
  );
  TestValidator.equals(
    "created member bio matches",
    createdMember.bio,
    userBio,
  );
  TestValidator.equals(
    "created member avatar URL matches",
    createdMember.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "created member status matches",
    createdMember.status,
    status,
  );

  // Step 2: Perform multiple retrievals of the same user profile
  const userId: string = createdMember.id;

  const firstRetrieval: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.at(connection, {
      userId: userId,
    });
  typia.assert(firstRetrieval);

  const secondRetrieval: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.at(connection, {
      userId: userId,
    });
  typia.assert(secondRetrieval);

  const thirdRetrieval: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.at(connection, {
      userId: userId,
    });
  typia.assert(thirdRetrieval);

  const fourthRetrieval: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.at(connection, {
      userId: userId,
    });
  typia.assert(fourthRetrieval);

  // Step 3: Validate data consistency across all retrievals
  TestValidator.equals(
    "all retrievals return same user ID",
    firstRetrieval.id,
    userId,
  );
  TestValidator.equals(
    "second retrieval matches first retrieval",
    secondRetrieval.id,
    firstRetrieval.id,
  );
  TestValidator.equals(
    "third retrieval matches first retrieval",
    thirdRetrieval.id,
    firstRetrieval.id,
  );
  TestValidator.equals(
    "fourth retrieval matches first retrieval",
    fourthRetrieval.id,
    firstRetrieval.id,
  );

  // Validate display name consistency
  TestValidator.equals(
    "display name consistent across retrievals",
    firstRetrieval.display_name,
    displayName,
  );
  TestValidator.equals(
    "display name remains same in second retrieval",
    secondRetrieval.display_name,
    displayName,
  );
  TestValidator.equals(
    "display name remains same in third retrieval",
    thirdRetrieval.display_name,
    displayName,
  );
  TestValidator.equals(
    "display name remains same in fourth retrieval",
    fourthRetrieval.display_name,
    displayName,
  );

  // Validate email consistency
  TestValidator.equals(
    "email consistent across retrievals",
    firstRetrieval.email,
    memberEmail,
  );
  TestValidator.equals(
    "email remains same in second retrieval",
    secondRetrieval.email,
    memberEmail,
  );
  TestValidator.equals(
    "email remains same in third retrieval",
    thirdRetrieval.email,
    memberEmail,
  );
  TestValidator.equals(
    "email remains same in fourth retrieval",
    fourthRetrieval.email,
    memberEmail,
  );

  // Validate bio consistency
  TestValidator.equals(
    "bio consistent across retrievals",
    firstRetrieval.bio,
    userBio,
  );
  TestValidator.equals(
    "bio remains same in second retrieval",
    secondRetrieval.bio,
    userBio,
  );
  TestValidator.equals(
    "bio remains same in third retrieval",
    thirdRetrieval.bio,
    userBio,
  );
  TestValidator.equals(
    "bio remains same in fourth retrieval",
    fourthRetrieval.bio,
    userBio,
  );

  // Validate avatar URL consistency
  TestValidator.equals(
    "avatar URL consistent across retrievals",
    firstRetrieval.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "avatar URL remains same in second retrieval",
    secondRetrieval.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "avatar URL remains same in third retrieval",
    thirdRetrieval.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "avatar URL remains same in fourth retrieval",
    fourthRetrieval.avatar_url,
    avatarUrl,
  );

  // Validate status consistency
  TestValidator.equals(
    "status consistent across retrievals",
    firstRetrieval.status,
    status,
  );
  TestValidator.equals(
    "status remains same in second retrieval",
    secondRetrieval.status,
    status,
  );
  TestValidator.equals(
    "status remains same in third retrieval",
    thirdRetrieval.status,
    status,
  );
  TestValidator.equals(
    "status remains same in fourth retrieval",
    fourthRetrieval.status,
    status,
  );

  // Step 4: Validate temporal data consistency
  TestValidator.equals(
    "created_at timestamps are identical",
    firstRetrieval.created_at,
    secondRetrieval.created_at,
  );
  TestValidator.equals(
    "created_at remains consistent in third retrieval",
    firstRetrieval.created_at,
    thirdRetrieval.created_at,
  );
  TestValidator.equals(
    "created_at remains consistent in fourth retrieval",
    firstRetrieval.created_at,
    fourthRetrieval.created_at,
  );

  TestValidator.equals(
    "updated_at timestamps are identical",
    firstRetrieval.updated_at,
    secondRetrieval.updated_at,
  );
  TestValidator.equals(
    "updated_at remains consistent in third retrieval",
    firstRetrieval.updated_at,
    thirdRetrieval.updated_at,
  );
  TestValidator.equals(
    "updated_at remains consistent in fourth retrieval",
    firstRetrieval.updated_at,
    fourthRetrieval.updated_at,
  );

  // Ensure no unexpected deleted_at values appear
  TestValidator.equals(
    "deleted_at should be undefined for active user",
    firstRetrieval.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "deleted_at should remain undefined in all retrievals",
    secondRetrieval.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "deleted_at should remain undefined in third retrieval",
    thirdRetrieval.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "deleted_at should remain undefined in fourth retrieval",
    fourthRetrieval.deleted_at,
    undefined,
  );

  // Step 5: Validate complete object equality between retrievals
  TestValidator.equals(
    "first and second retrievals are identical",
    firstRetrieval,
    secondRetrieval,
  );
  TestValidator.equals(
    "first and third retrievals are identical",
    firstRetrieval,
    thirdRetrieval,
  );
  TestValidator.equals(
    "first and fourth retrievals are identical",
    firstRetrieval,
    fourthRetrieval,
  );
  TestValidator.equals(
    "second and third retrievals are identical",
    secondRetrieval,
    thirdRetrieval,
  );
  TestValidator.equals(
    "second and fourth retrievals are identical",
    secondRetrieval,
    fourthRetrieval,
  );
  TestValidator.equals(
    "third and fourth retrievals are identical",
    thirdRetrieval,
    fourthRetrieval,
  );

  // Step 6: Validate profile data integrity
  TestValidator.predicate(
    "user ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstRetrieval.id,
    ),
  );
  TestValidator.predicate(
    "email format is valid",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstRetrieval.email),
  );
  TestValidator.predicate(
    "created_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstRetrieval.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstRetrieval.updated_at),
  );

  // Validate avatar URL format if present
  if (firstRetrieval.avatar_url) {
    TestValidator.predicate(
      "avatar URL format is valid",
      /^https?:\/\/[^\s]+$/.test(firstRetrieval.avatar_url),
    );
  }
}
