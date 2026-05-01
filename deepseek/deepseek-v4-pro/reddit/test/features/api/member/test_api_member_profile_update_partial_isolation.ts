import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test partial profile update isolation when changing only the display name.
 *
 * Validates that when a newly joined member updates only their display_name via PATCH,
 * the other optional profile fields — bio and avatar_uri — remain completely untouched
 * at their default null values. This ensures the server correctly implements partial
 * updates rather than resetting omitted fields.
 *
 * 1. Register and authenticate a new member through authorize_member_join.
 * 2. Capture the original display_name from the join response (which defaults to username).
 * 3. Generate a new, distinct display_name using RandomGenerator.
 * 4. Send a PATCH request with only { display_name: newName } — omitting bio and avatar_uri.
 * 5. Validate that the response reflects the updated display_name while bio and avatar_uri remain null.
 */
export async function test_api_member_profile_update_partial_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Capture original profile values from join response
  const originalDisplayName = member.display_name;
  // 3. Generate a new display_name distinct from the original
  const newDisplayName = RandomGenerator.name();
  // 4. Update only the display_name — omit bio and avatar_uri
  const updated = await api.functional.communityHub.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ICommunityHubMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate partial update isolation
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display_name changed from original",
    updated.display_name,
    originalDisplayName,
  );
  TestValidator.equals("bio remains null", updated.bio, null);
  TestValidator.equals("avatar_uri remains null", updated.avatar_uri, null);
}
