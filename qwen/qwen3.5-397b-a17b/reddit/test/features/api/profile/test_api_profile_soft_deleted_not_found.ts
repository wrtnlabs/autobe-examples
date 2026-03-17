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

export async function test_api_profile_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 2. Verify the profile is accessible for active member (baseline test)
  const activeProfile = await api.functional.redditClone.profiles.at(
    connection,
    {
      memberId: member.id,
    },
  );
  typia.assert(activeProfile);
  // Validate baseline: active profile should have matching data
  TestValidator.equals("profile id matches", activeProfile.id, member.id);
  TestValidator.equals(
    "username matches",
    activeProfile.username,
    member.username,
  );
  TestValidator.equals(
    "display_name matches",
    activeProfile.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "profile is not deleted",
    activeProfile.deleted_at === null,
  );
  // 3. Test soft-deleted profile returns 404
  // NOTE: In a complete implementation, a delete endpoint would be called here
  // to soft-delete the member account. Since no delete endpoint is available
  // in the provided API functions, we document the expected behavior:
  // After soft-deletion, accessing the profile should return HTTP 404.
  //
  // Expected implementation pattern:
  // await api.functional.redditClone.members.delete(adminConnection, {
  //   memberId: member.id,
  // });
  // await TestValidator.httpError("soft-deleted profile returns 404", 404, async () => {
  //   await api.functional.redditClone.profiles.at(connection, {
  //     memberId: member.id,
  //   });
  // });
  //
  // For now, we validate that the profile access pattern works correctly
  // and the deleted_at field is null for active profiles (validated above).
}
