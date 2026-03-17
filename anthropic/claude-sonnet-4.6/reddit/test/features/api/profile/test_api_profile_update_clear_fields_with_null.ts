import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_clear_fields_with_null(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Set display_name, bio, and avatar_url to non-null values
  const bioText = RandomGenerator.paragraph({ sentences: 3 });
  const firstUpdate = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
        bio: bioText,
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityUserProfile.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Step 3: Verify the response reflects all three fields set
  TestValidator.predicate(
    "displayName is set",
    firstUpdate.displayName !== null,
  );
  TestValidator.predicate("bio is set", firstUpdate.bio !== null);
  TestValidator.predicate("avatarUrl is set", firstUpdate.avatarUrl !== null);
  // Step 4: Call PUT /community/member/profile again with explicit null for
  // display_name and avatar_url, same bio (no-change for bio)
  const secondUpdate = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: null,
        bio: bioText,
        avatar_url: null,
      } satisfies ICommunityUserProfile.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // Step 5: Verify the returned ICommunityUserProfile
  // displayName cleared by explicit null
  TestValidator.equals(
    "displayName is null after clear",
    secondUpdate.displayName,
    null,
  );
  // avatarUrl cleared by explicit null
  TestValidator.equals(
    "avatarUrl is null after clear",
    secondUpdate.avatarUrl,
    null,
  );
  // bio remains the same (no-change accepted without error)
  TestValidator.equals("bio unchanged", secondUpdate.bio, bioText);
  // karmaScore is still 0 (system-managed)
  TestValidator.equals("karmaScore is 0", secondUpdate.karmaScore, 0);
}
