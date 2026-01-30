import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { prepare_random_economic_forum_post } from "../../../prepare/prepare_random_economic_forum_post";
import { generate_random_economic_forum_user_posts_create } from "../../../generate/generate_random_economic_forum_user_posts_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
/**
 * Test successful user profile update by the authenticated owner.
 *
 * This test follows the workflow: user joins, creates a post to establish
 * existence, then performs a profile update with an empty body as required by
 * IEconomicForumUser.IUpdate schema. The update is performed on the
 * authenticated user's account. The test validates that the returned user
 * object still contains the expected id property while ensuring sensitive
 * security fields (password_hashed, salt) remain excluded from the response.
 *
 * Note: The IEconomicForumUser schema only includes the 'id' property. Although
 * the scenario expects 'updated_at' and 'created_at' fields, these properties
 * do not exist in the actual type definition and must be excluded from
 * validation. We validate only what the API contract actually provides.
 *
 * Workflow:
 *
 * 1. Authenticate new user via join
 * 2. Create a post to establish user existence
 * 3. Perform profile update with empty body (IEconomicForumUser.IUpdate is {})
 * 4. Validate the returned user object has the correct id and excludes sensitive
 *    fields
 */
export async function test_api_user_profile_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an actor-specific connection and authenticate the user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: IEconomicForumUser.IAuthorized =
    await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // Step 2: Create a post to establish user existence before profile update
  // Use generation function for 'POST /economicForum/user/posts'
  const post: IEconomicForumPost =
    await generate_random_economic_forum_user_posts_create(userConnection, {});
  typia.assert(post);
  // Step 3: Prepare the profile update data according to the actual schema
  // IEconomicForumUser.IUpdate is defined as {} - an empty object.
  // Therefore, this is the only valid request body for the update operation.
  const updateData = {} satisfies IEconomicForumUser.IUpdate;
  // Step 4: Update the user profile using the authenticated user's connection
  // This validates that the update is only allowed for the authenticated owner
  const updatedUser: IEconomicForumUser =
    await api.functional.economicForum.user.users.update(userConnection, {
      userId: authorizedUser.id,
      body: updateData,
    });
  typia.assert(updatedUser);
  // Step 5: Validate the response contains the expected id property
  // IEconomicForumUser schema only has 'id' as its property
  TestValidator.equals(
    "user.id matches original",
    updatedUser.id,
    authorizedUser.id,
  );
  // Step 6: Validate that password field is explicitly excluded from response
  // The specification states password field is intentionally excluded for security
  TestValidator.predicate(
    "password_hashed is not present",
    !("password_hashed" in updatedUser),
  );
  TestValidator.predicate("salt is not present", !("salt" in updatedUser));
}
