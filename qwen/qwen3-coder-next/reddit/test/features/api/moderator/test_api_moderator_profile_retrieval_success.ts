import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
  } satisfies IRedditLikeModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  // 2. Retrieve moderator profile
  const profile =
    await api.functional.redditLike.moderator.profile.at(moderatorConnection);
  typia.assert(profile);
  // 3. Validate required profile fields exist
  TestValidator.predicate(
    "id exists",
    profile.id !== null && profile.id !== undefined,
  );
  TestValidator.predicate(
    "username exists",
    profile.username !== null && profile.username !== undefined,
  );
  TestValidator.predicate(
    "display_name exists",
    profile.display_name !== null && profile.display_name !== undefined,
  );
  TestValidator.predicate(
    "karma_score exists",
    profile.karma_score !== null && profile.karma_score !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    profile.created_at !== null && profile.created_at !== undefined,
  );
  // 4. Validate optional fields (bio and avatar_url)
  TestValidator.predicate("bio exists (nullable)", profile.bio !== undefined);
  TestValidator.predicate(
    "avatar_url exists (nullable)",
    profile.avatar_url !== undefined,
  );
  // 5. Verify sensitive fields are excluded (not present in response)
  TestValidator.predicate("email not exposed", !("email" in profile));
  TestValidator.predicate(
    "passwordHash not exposed",
    !("passwordHash" in profile),
  );
  // 6. Validate karma score is non-negative integer
  TestValidator.predicate(
    "karma_score is non-negative",
    profile.karma_score >= 0,
  );
  TestValidator.predicate(
    "karma_score is integer",
    Number.isInteger(profile.karma_score),
  );
}
