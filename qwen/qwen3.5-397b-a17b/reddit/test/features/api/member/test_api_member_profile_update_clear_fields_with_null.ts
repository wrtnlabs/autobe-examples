import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_clear_fields_with_null(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Set initial profile values (display_name and bio)
  const initialUpdate =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: RandomGenerator.name(2),
          bio: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(initialUpdate);
  // Verify initial values are set
  TestValidator.predicate(
    "display_name has content",
    initialUpdate.display_name.length > 0,
  );
  TestValidator.predicate("bio has content", initialUpdate.bio!.length > 0);
  // 3. Update profile with null values to clear fields
  const clearUpdate =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: null,
          bio: null,
        } satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(clearUpdate);
  // 4. Verify bio field is cleared (null) - display_name type is non-nullable string per DTO
  TestValidator.equals("bio cleared to null", clearUpdate.bio, null);
  // 5. Verify profile remains valid and accessible after clearing fields
  TestValidator.predicate("profile id exists", clearUpdate.id !== undefined);
  TestValidator.predicate(
    "member info exists",
    clearUpdate.member !== undefined,
  );
  TestValidator.predicate(
    "member username exists",
    clearUpdate.member.username.length > 0,
  );
  TestValidator.predicate(
    "karma_score is number",
    typeof clearUpdate.karma_score === "number",
  );
  // 6. Verify updated_at timestamp reflects the update
  TestValidator.notEquals(
    "updated_at changed after update",
    initialUpdate.updated_at,
    clearUpdate.updated_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(clearUpdate.updated_at).getTime() >=
      new Date(clearUpdate.created_at).getTime(),
  );
}
