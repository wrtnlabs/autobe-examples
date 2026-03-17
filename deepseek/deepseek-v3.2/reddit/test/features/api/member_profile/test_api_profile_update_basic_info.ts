import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_basic_info(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {});
  typia.assert(joinResponse);
  // Step 2: Prepare profile update with new display name (nickname)
  const updateBody = {
    display_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformMember.IUpdate;
  // Step 3: Call profile update endpoint
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // Step 4: Validate the update results
  TestValidator.equals(
    "nickname should be updated",
    updatedProfile.nickname,
    updateBody.display_name,
  );
  // Step 5: Verify unchanged fields remain same
  TestValidator.equals(
    "username should remain unchanged",
    updatedProfile.username,
    joinResponse.username,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedProfile.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedProfile.id,
    joinResponse.id,
  );
  // Step 6: Validate karma score exists and is displayed
  TestValidator.predicate(
    "karma score should exist",
    () => typeof updatedProfile.karma === "number",
  );
}
