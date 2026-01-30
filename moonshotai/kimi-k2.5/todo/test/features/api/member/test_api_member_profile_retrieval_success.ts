import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a dedicated connection for the member and authenticate via registration
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // Step 2: Retrieve the authenticated member's profile using the /me endpoint
  const profile =
    await api.functional.todoApp.member.auth.members.me.at(memberConnection);
  // Step 3: Validate the response structure matches ITodoAppMember type
  typia.assert(profile);
  // Step 4: Verify the retrieved profile matches the authenticated member's identity
  TestValidator.equals(
    "profile id matches authorized member id",
    profile.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "profile email matches authorized member email",
    profile.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "profile name matches authorized member name",
    profile.name,
    authorizedMember.name,
  );
}
