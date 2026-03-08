import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_full(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Update profile with new display name and bio
  const newDisplayName = RandomGenerator.name(1);
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    displayName: newDisplayName,
    bio: newBio,
  } satisfies IDiscussionBoardMember.IUpdate;
  const updatedMember =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      { body: updateBody },
    );
  typia.assert(updatedMember);
  // 3. Verify response contains correct display_name and bio
  TestValidator.equals(
    "display name updated",
    updatedMember.displayName,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedMember.bio, newBio);
  TestValidator.equals("member id unchanged", updatedMember.id, member.id);
  // 4. Verify display names are not unique - create another member with same display name
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: { displayName: newDisplayName },
  });
  typia.assert(member2);
  TestValidator.equals(
    "second member can have same display name",
    member2.displayName,
    newDisplayName,
  );
  TestValidator.notEquals("members have different ids", member.id, member2.id);
}
