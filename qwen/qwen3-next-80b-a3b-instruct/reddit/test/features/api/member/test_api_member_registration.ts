import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the member actor
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Use the authorization utility function to register a member
  // This utility function exists for POST /communityBbs/auth/member/join
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  // Step 3: Validate the response according to ICommunityBbsMember.IAuthorized schema
  typia.assert(member);
  // Step 4: Validate required business state properties
  TestValidator.equals(
    "member is pending_verification",
    member.status,
    "pending_verification",
  );
  TestValidator.equals("karma_score initialized to 0", member.karma_score, 0);
  TestValidator.equals(
    "account_verified is false",
    member.account_verified,
    false,
  );
}
