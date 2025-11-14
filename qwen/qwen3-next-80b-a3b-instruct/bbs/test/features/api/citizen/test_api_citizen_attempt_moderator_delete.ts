import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";
import type { IPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPost";

export async function test_api_citizen_attempt_moderator_delete(
  connection: api.IConnection,
) {
  const citizenOne: IPoliticalForumCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<IPoliticalForumCitizen.ICreate>(),
    });
  typia.assert(citizenOne);

  const postOne: IPoliticalForumPost =
    await api.functional.politicalForum.citizen.posts.create(connection, {
      body: typia.random<IPoliticalForumPost.ICreate>(),
    });
  typia.assert(postOne);

  const citizenTwo: IPoliticalForumCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<IPoliticalForumCitizen.ICreate>(),
    });
  typia.assert(citizenTwo);

  const postTwo: IPoliticalForumPost =
    await api.functional.politicalForum.citizen.posts.create(connection, {
      body: typia.random<IPoliticalForumPost.ICreate>(),
    });
  typia.assert(postTwo);

  const moderator: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: typia.random<IPoliticalForumModerator.ICreate>(),
    });
  typia.assert(moderator);

  // Attempt to delete citizenTwo's account as citizenOne (unauthorized)
  await TestValidator.error(
    "citizen cannot delete another citizen",
    async () => {
      await api.functional.politicalForum.moderator.users.erase(connection, {
        userId: citizenTwo.id,
      });
    },
  );
}
