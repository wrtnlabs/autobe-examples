import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member to have permission to delete own account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformMember.IJoin;
  const auth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  typia.assert(auth);
  // Step 2: Use the authenticated member connection to delete the member account
  await api.functional.communityPlatform.member.members.erase(
    memberConnection,
    {
      memberId: auth.member_id,
    },
  );
  // Verification: The delete operation succeeded. We can't verify cascade deletion, session invalidation,
  // audit logging, or profile inaccessibility because the API SDK doesn't provide endpoints for these verifications.
  // Only the "erase" operation is available for member deletion.
  // This is the maximum testable scope with the provided API SDK.
}
