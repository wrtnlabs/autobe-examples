import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const initialDisplayName = RandomGenerator.name(3);
  const newDisplayName = RandomGenerator.name(3);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Step 1: Join as a new member using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Create member connection with JWT token from join response
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joinResponse.token.access}`,
    },
  };
  // Step 3: Update member profile with new display name
  const profileBody = {
    displayName: newDisplayName,
  } satisfies IMultiUserTodoAppMember.IUpdate;
  const profileResponse =
    await api.functional.multiUserTodoApp.member.profile.update(
      memberConnection,
      { body: profileBody },
    );
  typia.assert(profileResponse);
  // Step 4: Validate updated display name matches new value
  TestValidator.equals(
    "display name updated successfully",
    profileResponse.displayName,
    newDisplayName,
  );
  // Step 5: Validate updatedAt timestamp is recent
  const now = new Date();
  const updatedAt = new Date(profileResponse.updatedAt);
  TestValidator.predicate(
    "updatedAt is recent timestamp",
    updatedAt.getTime() >= now.getTime() - 1000,
  );
  // Step 6: Verify profile structure matches join response
  TestValidator.equals(
    "profile has valid id",
    profileResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "profile has valid createdAt",
    profileResponse.createdAt,
    joinResponse.createdAt,
  );
  TestValidator.notEquals(
    "updatedAt changed from createdAt",
    profileResponse.createdAt,
    profileResponse.updatedAt,
  );
}