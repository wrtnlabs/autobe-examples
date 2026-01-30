import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { INumber } from "@ORGANIZATION/PROJECT-api/lib/structures/INumber";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_user_reputation_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityBbsMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: memberData },
  );
  // Step 2: Verify authentication was successful
  typia.assert(member);
  TestValidator.equals("member ID is present", member.id, member.id);
  // Step 3: Retrieve the member's reputation score
  const reputation: INumber =
    await api.functional.communityBbs.member.users.reputation.at(
      memberConnection,
      {
        userId: member.id,
      },
    );
  // Step 4: Validate the reputation response
  typia.assert(reputation);
}
