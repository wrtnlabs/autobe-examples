import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_partial_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(memberData);
  // Step 2: Update profile with only display_name (partial update)
  const newDisplayName = RandomGenerator.name();
  const updatedMember =
    await api.functional.hrmTracker.member.profile.updateProfile(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
          avatar_url: null,
          phone: null,
        } satisfies IHrmTrackerMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // Step 3: Validate partial update was applied
  TestValidator.equals(
    "display_name updated correctly",
    updatedMember.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "avatar_url remains null",
    updatedMember.avatar_url,
    null,
  );
  TestValidator.equals("phone remains null", updatedMember.phone, null);
}
