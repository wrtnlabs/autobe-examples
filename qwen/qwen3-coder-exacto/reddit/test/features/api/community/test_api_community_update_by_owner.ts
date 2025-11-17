import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a user via join
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinInput,
    });
  typia.assert(user);

  // Step 2: Create a community with the user
  const createCommunityInput = {
    name: "Original Community Name",
    slug: "original-community-slug",
    title: "Original Community Title",
    description: "Original community description",
    rules: "Original community rules",
    privacy_level: "public" as const,
    status: "active" as const,
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: createCommunityInput,
    });
  typia.assert(community);

  // Step 3: Update the community information
  const updateCommunityInput = {
    name: "Updated Community Name",
    title: "Updated Community Title",
    description: "Updated community description",
    rules: "Updated community rules",
    privacy_level: "private" as const,
    status: "inactive" as const,
  } satisfies ICommunityForumCommunityGroup.IUpdate;

  const updatedCommunity: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.update(connection, {
      communitySlug: community.slug,
      body: updateCommunityInput,
    });
  typia.assert(updatedCommunity);

  // Step 4: Validate that the community was updated correctly
  TestValidator.equals(
    "community name updated",
    updatedCommunity.name,
    updateCommunityInput.name!,
  );
  TestValidator.equals(
    "community slug unchanged",
    updatedCommunity.slug,
    community.slug,
  ); // slug should not change
  TestValidator.equals(
    "community title updated",
    updatedCommunity.title,
    updateCommunityInput.title!,
  );
  TestValidator.equals(
    "community description updated",
    updatedCommunity.description,
    updateCommunityInput.description!,
  );
  TestValidator.equals(
    "community rules updated",
    updatedCommunity.rules,
    updateCommunityInput.rules!,
  );
  TestValidator.equals(
    "community privacy level updated",
    updatedCommunity.privacy_level,
    updateCommunityInput.privacy_level!,
  );
  TestValidator.equals(
    "community status updated",
    updatedCommunity.status,
    updateCommunityInput.status!,
  );
  TestValidator.equals(
    "community creator id unchanged",
    updatedCommunity.created_by_id,
    community.created_by_id,
  );
  TestValidator.predicate(
    "community updated timestamp exists",
    () => updatedCommunity.updated_at !== undefined,
  );
}
