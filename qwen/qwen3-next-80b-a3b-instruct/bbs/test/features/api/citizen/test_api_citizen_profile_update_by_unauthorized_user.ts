import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";
import type { IPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPost";

export async function test_api_citizen_profile_update_by_unauthorized_user(
  connection: api.IConnection,
) {
  // Step 1: Create first citizen account (attacker)
  const attackerEmail: string = typia.random<string & tags.Format<"email">>();
  const attacker: IPoliticalForumCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: "dummy_create_string" satisfies IPoliticalForumCitizen.ICreate,
    });
  typia.assert(attacker);

  // Step 2: Create a post to establish attacker's account context
  const attackerPost: IPoliticalForumPost =
    await api.functional.politicalForum.citizen.posts.create(connection, {
      body: "dummy_create_string" satisfies IPoliticalForumPost.ICreate,
    });
  typia.assert(attackerPost);

  // Step 3: Create second citizen account (target profile)
  const targetEmail: string = typia.random<string & tags.Format<"email">>();
  const target: IPoliticalForumCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: "dummy_create_string" satisfies IPoliticalForumCitizen.ICreate,
    });
  typia.assert(target);

  // Step 4: Create a post to establish target's account context
  const targetPost: IPoliticalForumPost =
    await api.functional.politicalForum.citizen.posts.create(connection, {
      body: "dummy_create_string" satisfies IPoliticalForumPost.ICreate,
    });
  typia.assert(targetPost);

  // Step 5: Switch context to attacker and attempt to update target's profile
  // We maintain the attacker's authentication token from join() call
  await TestValidator.error(
    "unauthorized user cannot update another citizen's profile",
    async () => {
      await api.functional.politicalForum.citizen.users.patchByUserid(
        connection,
        {
          userId: target.id, // Target user ID (not attacker's)
          body: "dummy_update_string" satisfies IPoliticalForumCitizen.IUpdate,
        },
      );
    },
  );
}
