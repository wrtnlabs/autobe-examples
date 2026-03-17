import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test partial update scenario where a member updates only one or two fields
 * while leaving others unchanged. The member joins, then updates only the
 * display_name while bio and avatar remain at their original values. Validate
 * that only the provided field is updated, other fields retain their original
 * values, and the updated_at timestamp reflects the change. This validates the
 * partial update semantics required by the business logic.
 */
export async function test_api_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Store original profile values
  const originalDisplayName = joinResult.display_name;
  const originalBio = joinResult.bio;
  const originalAvatar = joinResult.avatar;
  const originalUpdatedAt = joinResult.updated_at;
  // 3. Update only display_name (partial update)
  const newDisplayName = RandomGenerator.name();
  const updateResult = await api.functional.redditClone.profiles.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(updateResult);
  // 4. Validate partial update semantics
  TestValidator.equals(
    "display_name updated",
    updateResult.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio unchanged", updateResult.bio, originalBio);
  TestValidator.equals("avatar unchanged", updateResult.avatar, originalAvatar);
  // 5. Validate updated_at timestamp changed
  const originalTime = new Date(originalUpdatedAt).getTime();
  const updatedTime = new Date(updateResult.updated_at).getTime();
  TestValidator.predicate(
    "updated_at reflects change",
    updatedTime > originalTime,
  );
}
